'use strict';
var express = require('express');
var fs = require('fs');
var path = require('path');
var app = express();
var files = path.join(__dirname, 'blinkon7');

app.use('/blinkon7', express.static(files));

app.get('/stream', function (req, res) {
  fs.readFile(path.join(files, 'lorem.html'), 'utf8', function(err, contents) {
    var offset = 0;
    function writeChunk() {
      res.write(contents.substr(offset, 16));
      offset += 16;
      if (offset < contents.length) {
        setTimeout(writeChunk, 100);
      } else {
        res.end();
      }
    }
    writeChunk();
  });
});

app.listen(9999, '127.0.0.1', function () {
  console.log('Example app listening on port 9999!')
});
