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

function cm_beautify(cm) {
  while((t = cm.getValue().indexOf("hello")) != -1) {
    cm.operation(function () {
      var from = cm.posFromIndex(t);
      var to = cm.posFromIndex(t + 5);
      cm.replaceRange("hola", from, to);
    });
  }
}