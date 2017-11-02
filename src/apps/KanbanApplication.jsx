import React from 'react';
import PropTypes from 'prop-types';
import isEqual from 'lodash/isEqual';
import assign from 'lodash/assign';
import clone from 'lodash/clone';

import { DragDropContext, DragSource, DropTarget } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

class KanbanModelList {
  constructor(name) {
    this.name = name;
    this.items = [];
  }
  addItem(item) {
    this.items.push(item);
  }
  insertItem(index, item) {
    this.items.splice(index, 0, item);
  }
  getLength() {
    return this.items.length;
  }
  getItemAt(index) {
    return this.items[index];
  }
  removeItemAt(index) {
    this.items.splice(index, 1);
  }
  toMarkdown() {
    return [
      `* ${this.name}`,
      ...this.items.map(s => `  * ${s}`),
    ].join('\n');
  }
}

class KanbanModel {
  constructor() {
    this.lists = [];
  }
  addList(str) {
    this.lists.push(new KanbanModelList(str));
  }
  getLength() {
    return this.lists.length;
  }
  getListAt(index) {
    return this.lists[index];
  }
  removeListAt(index) {
    this.lists.splice(index, 1);
  }
  moveItem(fromListIndex, fromItemIndex, toListIndex, toItemIndex) {
    const fromList = this.getListAt(fromListIndex);
    const item = fromList.getItemAt(fromItemIndex);
    fromList.removeItemAt(fromItemIndex);
    this.getListAt(toListIndex).insertItem(toItemIndex, item);
  }
  equals(other) {
    return isEqual(this, other);
  }
  serialize() {
    return this.lists.map(l => l.toMarkdown()).join('\n');
  }
  static deserialize(str) {
    try {
      const reList = /^[*-]\s*(.*)$/;
      const reItem = /^\s+[*-]\s*(.*)$/;
      const lines = str.split('\n');
      const model = new KanbanModel();
      lines.forEach((l) => {
        const matchList = l.match(reList);
        const matchItem = l.match(reItem);
        if (matchList) {
          model.addList(matchList[1]);
        } else if (matchItem) {
          const listLength = model.getLength();
          if (listLength) {
            model.getListAt(listLength - 1).addItem(matchItem[1]);
          }
        }
      });
      return model;
    } catch (ex) {
      return new KanbanModel();
    }
  }
}

const cellStyle = {
  border: '1px solid grey',
  verticalAlign: 'top',
};
const cardStyle = {
  backgroundColor: 'LemonChiffon',
  border: '1px solid silver',
  display: 'block',
  margin: '0.1em',
  padding: '0.1em',
  cursor: 'grab',
};
const cardDraggingStyle = assign(clone(cardStyle), {
  backgroundColor: 'transparent',
});

const dndType = 'kanban-card';
const cardSource = {
  beginDrag(props) {
    return {
      itemId: props.itemId,
    };
  },
};
const cardTarget = {
  drop(props, monitor /* , component */) {
    const dragItemId = monitor.getItem().itemId;
    const hoverItemId = props.itemId;
    if (isEqual(dragItemId, hoverItemId)) {
      return;
    }
    props.callbacks.moveItem(dragItemId, hoverItemId);
  },
  hover(props, monitor /* , component */) {
    const dragItemId = monitor.getItem().itemId;
    const hoverItemId = props.itemId;
    if (isEqual(dragItemId, hoverItemId)) {
      return;
    }
    props.callbacks.previewMoveItem(dragItemId, hoverItemId);
  },
};

class KanbanCard extends React.Component {
  constructor() {
    super();
    this.remove = this.remove.bind(this);
  }
  remove() {
    this.props.callbacks.removeItem(this.props.itemId);
  }
  render() {
    return this.props.connectDragSource(this.props.connectDropTarget((
      <span style={this.props.isDragging ? cardDraggingStyle : cardStyle}>
        {this.props.title}
        <input type="button" style={{ float: 'right' }} value="x" onClick={this.remove} />
      </span>
    )));
  }
}
KanbanCard.propTypes = {
  title: PropTypes.string.isRequired,
  itemId: PropTypes.shape({}).isRequired,
  callbacks: PropTypes.shape({
    removeItem: PropTypes.func.isRequired,
    moveItem: PropTypes.func.isRequired,
    previewMoveItem: PropTypes.func.isRequired,
  }).isRequired,
  // DND
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
};

const KanbanCardDraggable = DropTarget(dndType, cardTarget, connect => ({
  connectDropTarget: connect.dropTarget(),
}))(DragSource(dndType, cardSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
}))(KanbanCard));

const KanbanList = props => (
  <td style={cellStyle}>
    <h2>{props.model.name} <input type="button" style={{ float: 'right' }} data-index={props.listIndex} value="x" onClick={props.callbacks.removeList} /></h2>
    {props.model.items.map((s, i) => <KanbanCardDraggable title={s} itemId={{ list: props.listIndex, item: i }} callbacks={props.callbacks} />)}
  </td>);
KanbanList.propTypes = {
  model: PropTypes.instanceOf(KanbanModelList).isRequired,
  listIndex: PropTypes.number.isRequired,
  callbacks: PropTypes.shape({
    removeList: PropTypes.func.isRequired,
    removeItem: PropTypes.func.isRequired,
    moveItem: PropTypes.func.isRequired,
    previewMoveItem: PropTypes.func.isRequired,
  }).isRequired,
};

// eslint-disable-next-line react/no-multi-comp
class KanbanApplication extends React.Component {
  constructor(props) {
    super();
    this.handleAddItem = this.handleAddItem.bind(this);
    this.handleAddList = this.handleAddList.bind(this);
    this.handleRemoveList = this.handleRemoveList.bind(this);
    this.handleRemoveItem = this.handleRemoveItem.bind(this);
    this.handleMoveItem = this.handleMoveItem.bind(this);
    this.handlePreviewMoveItem = this.handlePreviewMoveItem.bind(this);
    this.state = { kanban: KanbanModel.deserialize(props.data) };
    this.callbacks = {
      removeList: this.handleRemoveList,
      removeItem: this.handleRemoveItem,
      moveItem: this.handleMoveItem,
      previewMoveItem: this.handlePreviewMoveItem,
    };
  }
  componentWillReceiveProps(newProps) {
    if (this.props.data !== newProps.data) {
      const kanban = KanbanModel.deserialize(newProps.data);
      this.setState({ kanban });
    }
  }
  shouldComponentUpdate(newProps, nextState) {
    return !this.state.kanban.equals(nextState.kanban) || !isEqual(this.state.dragging, nextState.dragging);
  }
  handleAddItem(ev) {
    const index = parseInt(ev.target.getAttribute('data-index'), 10);
    const textbox = this[`input${index}`];
    if (textbox) {
      const text = textbox.value;
      if (text) {
        this.state.kanban.getListAt(index).addItem(text);
        this.forceUpdate();
        this.props.onEdit(this.state.kanban.serialize(), this.props.appContext);
      }
    }
  }
  handleAddList() {
    const textbox = this.inputList;
    const text = textbox.value;
    if (text) {
      this.state.kanban.addList(text);
      this.forceUpdate();
      this.props.onEdit(this.state.kanban.serialize(), this.props.appContext);
    }
  }
  handleRemoveList(ev) {
    const index = parseInt(ev.target.getAttribute('data-index'), 10);
    this.state.kanban.removeListAt(index);
    this.forceUpdate();
    this.props.onEdit(this.state.kanban.serialize(), this.props.appContext);
  }
  handleRemoveItem(itemId) {
    this.state.kanban.getListAt(itemId.list).removeItemAt(itemId.item);
    this.forceUpdate();
    this.props.onEdit(this.state.kanban.serialize(), this.props.appContext);
  }
  handleMoveItem(sourceId, targetId) {
    this.state.kanban.moveItem(sourceId.list, sourceId.item, targetId.list, targetId.item);
    this.setState({ dragging: null });
    this.forceUpdate();
    this.props.onEdit(this.state.kanban.serialize(), this.props.appContext);
  }
  handlePreviewMoveItem(sourceId, targetId) {
    this.setState({ dragging: { sourceId, targetId } });
  }
  renderRow2(index) {
    return (
      <td>
        <input ref={(c) => { this[`input${index}`] = c; }} type="text" placeholder="Add item" />
        <input type="button" value="Add" data-index={index} onClick={this.handleAddItem} />
      </td>);
  }
  render() {
    return (
      <div>
        <input ref={(c) => { this.inputList = c; }} type="text" placeholder="Add list" />
        <input type="button" value="Add list" onClick={this.handleAddList} />
        <table>
          <tbody>
            <tr>
              {this.state.kanban.lists.map((l, i) => <KanbanList model={l} listIndex={i} callbacks={this.callbacks} />)}
            </tr>
            <tr>
              {this.state.kanban.lists.map((l, i) => this.renderRow2(i))}
            </tr>
          </tbody>
        </table>
      </div>);
  }
}

KanbanApplication.Model = KanbanModel;

KanbanApplication.propTypes = {
  data: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
  appContext: PropTypes.shape({}).isRequired,
};

export default DragDropContext(HTML5Backend)(KanbanApplication);
