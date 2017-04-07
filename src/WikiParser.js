import React from 'react';
import Link from 'react-router-dom/Link';

import remark from 'remark';
import toHast from 'mdast-util-to-hast';
import toH from 'hast-to-hyperscript';

import clone from 'lodash/clone';
import isEqual from 'lodash/isEqual';
import repeat from 'lodash/repeat';

import Apps from './apps';

const internalLink = /^[./]/;

export default class WikiParser {
  /**
   * Parse Markdown string to hast
   * @param {!string} markdown
   * @returns {object} Hast object
   */
  static parseToHast(markdown) {
    const mdast = remark().parse(markdown);
    const hast = toHast(mdast);
    return hast;
  }
  /**
   * Convert fenced code block in hast to application
   * @param {!object} hast Hast object
   * @return {object} Hast object
   */
  static convertToCustomHast(hast) {
    if (hast.type === 'text') return hast;
    if (hast.tagName === 'pre') {
      const codeNode = hast.children[0];
      const htmlClasses = codeNode.properties.className;
      const language = (htmlClasses && htmlClasses[0].substring(9 /* length of 'language-' */)) || null;
      if (language in Apps) {
        const codeText = codeNode.children[0].value;
        return {
          type: 'element',
          tagName: `app:${language}`,
          properties: {
            // Original Hast posirion will be lost in hyperscript.
            // It must be a string?
            position: JSON.stringify(hast.position),
          },
          // Hast position
          position: hast.position,
          children: [{
            type: 'text',
            value: codeText,
          }],
        };
      }
    }
    const newChildren = hast.children.map(c => WikiParser.convertToCustomHast(c));
    if (!isEqual(newChildren, hast.children)) {
      const cloned = clone(hast);
      cloned.children = newChildren;
      return cloned;
    }
    return hast;
  }
  /**
   * Render custom Hast
   * @param {object} customHast
   * @param {object} ctx
   * @returns {React.Node}
   */
  static renderCustomHast(customHast, ctx = {}) {
    function h(name, props, children) {
      if (name.indexOf('app:') === 0) {
        const appName = name.substring(4);
        const appComponent = Apps[appName];
        if (appComponent) {
          return React.createElement(appComponent, {
            data: children[0],
            onEdit: ctx.onEdit,
            appContext: {
              language: appName,
              // It is not actually react props
              // eslint-disable-next-line react/prop-types
              position: JSON.parse(props.position),
            },
          });
        }
        throw new Error('unknown app');
      }
      // eslint-disable-next-line react/prop-types
      if (name === 'a' && internalLink.test(props.href)) {
        const propsForLink = clone(props);
        propsForLink.to = propsForLink.href;
        if (propsForLink.className) {
          propsForLink.className += ',md';
        } else {
          propsForLink.className = 'md';
        }
        delete propsForLink.href;
        return React.createElement(Link, propsForLink, children);
      }
      const propsForElem = clone(props);
      if (propsForElem) {
        if (propsForElem.className) {
          propsForElem.className += ',md';
        } else {
          propsForElem.className = 'md';
        }
      }
      return React.createElement(name, propsForElem, children);
    }

    let rootNode = customHast;
    if (rootNode.type === 'root') {
      rootNode = clone(rootNode);
      rootNode.type = 'element';
      rootNode.tagName = 'div';
    }
    return toH(h, rootNode);
  }
  /**
   * @param {!string} originalText
   * @param {!object} originalAppLocation The location (https://github.com/wooorm/unist#location) of fenced code block
   * @param {!string} appLanguage
   * @param {!string} newAppText
   * @returns {string}
   */
  static replaceAppCode(originalText, originalAppLocation, appLanguage, newAppText) {
    const textBefore = originalText.substring(0, originalAppLocation.start.offset);
    const textAfter = originalText.substring(originalAppLocation.end.offset);
    const endMarkIndentation = originalAppLocation.end.column - (1 + 3);
    const text = `${textBefore}\`\`\`${appLanguage}
${newAppText}
${repeat(' ', endMarkIndentation)}\`\`\`${textAfter}`;
    return text;
  }
}
