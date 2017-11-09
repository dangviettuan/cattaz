const files = [
  'index',
  'apps',
  'app-date',
  'app-datematcher',
  'app-draw',
  'app-hello',
  'app-helpful',
  'app-kanban',
  'app-kpt',
  'app-mandala',
  'app-map',
  'app-meetingtime',
  'app-reversi',
  'app-vote',
  'app-votecrypto',
  'app-weather',
];

const docs = {
};

files.forEach((f) => {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  docs[f] = require(`../docs/${f}.cattaz.md`);
});

export default docs;
