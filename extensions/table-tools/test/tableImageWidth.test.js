'use strict';
const assert = require('assert');
const {
  estimateTableImageWidth,
  MIN_TABLE_IMAGE_WIDTH,
  MAX_TABLE_IMAGE_WIDTH
} = require('../lib/tableImageWidth');

const narrowWidth = estimateTableImageWidth(
  ['Metric', 'Gasoline', 'CNG'],
  [['Fuel cost', '$5.00', '$1.50']]
);
assert.strictEqual(narrowWidth, MIN_TABLE_IMAGE_WIDTH);

const wideWidth = estimateTableImageWidth(
  ['Metric', 'Gasoline', 'CNG (Home Refuel)', 'Difference'],
  [
    [
      'Annual fuel cost (12,000 miles, 25 mpg)',
      '$2,400-$2,880',
      '$720-$960',
      '$1,440-$1,920 annual savings'
    ],
    ['5-year net fuel cost', '$12,000-$14,400', '$3,600-$4,800', '$7,200-$9,600 savings']
  ]
);
assert.ok(wideWidth > MIN_TABLE_IMAGE_WIDTH);

const hugeWidth = estimateTableImageWidth(
  ['A very long heading'.repeat(20), 'Another very long heading'.repeat(20), 'Third'.repeat(20), 'Fourth'.repeat(20)],
  []
);
assert.strictEqual(hugeWidth, MAX_TABLE_IMAGE_WIDTH);

console.log('tableImageWidth tests passed');
