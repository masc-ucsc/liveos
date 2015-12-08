/*
 * (C) Copyright 2015 Regents of the University of California and LiveOS Project.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *     Sina Hassani
 */

//Importing libraries
var exec = require('child_process').exec;
var fs = require('fs');

//Input files
var shapes = require('./shapes.js');
try {
  var input = JSON.parse(fs.readFileSync('input.json'));
} catch (err) {
  console.error('Bad JSON input (input.json)');
}

//Check if folders exist
if(!fs.existsSync('svg'))
  fs.mkdirSync('svg');
if(!fs.existsSync('png'))
  fs.mkdirSync('png');

//For each icon
input.forEach(function (item) {
  //Create SVG
  var str = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + item.size + '" height="' + item.size + '">';
  str += '<style type="text/css"><![CDATA[ * {fill:' + item.color + ';}]]></style>';
  str += shapes[item.name];
  str += '</svg>';

  //Store SVG file
  var name = item.name + item.size;
  fs.writeFile('svg/' + name + '.svg', str, function () {
    //convert SVG to PNG
    exec('inkscape -z -e png/' + name + '.png svg/' + name + '.svg');
  });
});
