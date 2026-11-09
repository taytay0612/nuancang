const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (!target) {
  console.error('usage: node reset-data.js <path-to-json>');
  process.exit(2);
}

const state = {
  app: '暖仓',
  schema: 1,
  version: 'v1.0',
  updatedAt: new Date().toISOString(),
  categories: ['工具', '五金', '食品', '药品', '文件', '日用品', '衣物', '电子产品', '纪念品', '其他'],
  boxes: [],
  history: [],
  trash: []
};

fs.writeFileSync(target, JSON.stringify(state, null, 2), 'utf8');
console.log('written', target, fs.statSync(target).size, 'bytes');
