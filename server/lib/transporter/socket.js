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

var MAX_SIZE = 4096;

module.exports = function (client) {
  var self = this;
  this.client = client;
  this.crypto = require("crypto");
  this.fs = require("fs");
  this.events = {};
  this.main_path = require("path").dirname(require.main.filename);
  this.schemas = JSON.parse(this.fs.readFileSync(this.main_path + "/conf/schemas.json"));
  this.buffer = 0;
  this.iv = null;
  this.key = null;
  this.orig_iv = this.fs.readFileSync(this.main_path + "/conf/iv");
  this.orig_key = this.fs.readFileSync(this.main_path + "/conf/key");
  this.passkey = this.fs.readFileSync(this.main_path + "/conf/passkey");
  this.decipher = null;
  this.chipher = null;
  this.registeration_try = 4;
  this.key_toggle = 1;
  this.client.bufferSize = MAX_SIZE;

  //on receiving data
  this.client.on("data", function (obj) {
    if(self.buffer)
      self.buffer = Buffer.concat([self.buffer, obj]);
    else
      self.buffer = obj;
    var data = self.fetch();
    while(data) {
      if(self.registeration_try < 5) {
        if(data.data == self.passkey) {
          self.registeration_try = 5;
          self.send("rregistered:");
        } else {
          self.registeration_try--;
        }
        if(self.registeration_try < 0)
          self.client.destroy();
        data = self.fetch();
        continue;
      }

      var message = "";

      switch(data.type) {
        case "s":
          self.schemas[data.sid] = JSON.parse("{" + data.data + "}");
          self.fs.writeFileSync("gstats.json", "{" + data.data + "}");
          self.send("s" + data.sid + ":ack");
          message = "schema";
          obj = data.sid;
        break;
        case "d":
          message = data.message;
          obj = data.data;
        break;
        case "c":
          if(data.message == "newkey")
            self.renew_key();
          message = data.message;
          obj = self.parse_lightson_str(data.data, self.schemas[message]);
        break;
      }

      if(message && self.events[message]) {
        self.events[message].forEach(function (handler) {
          handler(obj);
        });
      }
      data = self.fetch();
    }
  });

  this.client.on("error", function (e) {
    console.error("Transporter " + e);
  });

  //registering new events
  this.on = function (event_name, callback) {
    if(!self.events[event_name])
      self.events[event_name] = [];
    self.events[event_name].push(callback);
  };

  //extract one message and decode it
  this.fetch = function () {
    if(self.buffer.length < 5)
      return 0;
    var len = self.buffer.readInt32BE(0);
    if(self.buffer.length < len - 4) { //checkme
      return 0;
    }
    var chunk = new Buffer(len + 1);
    var keytype = new Buffer(1);
    self.buffer.copy(keytype, 0, 4, 5);
    self.buffer.copy(chunk, 0, 5, len + 5);
    self.buffer = self.buffer.slice(len + 5);
    var thiskey;
    if(keytype.readUInt8(0) == self.key_toggle)
      thiskey = self.key;
    else
      thiskey = self.old_key;
    var decipher = self.crypto.createDecipheriv("AES-128-CBC", thiskey, self.iv);
    var data = decipher.update(chunk);
    var out = {};
    out.type = data.toString("utf8", 0, 1);
    out.message = self.trim_string(data.toString("utf8", 1, 21));
    out.sid = self.trim_string(data.toString("utf8", 21, 41));
    out.len = data.readInt32BE(41);
    if(out.type == "d") {
      out.data = (self.parse_lightson(data.slice(45, 45 + out.len), self.schemas[out.sid])).data;
    } else {
      out.data = data.toString("utf8", 45, 45 + out.len);  
    }
    return out;
  };

  //converting lightson compact format to JavaScript object
  this.parse_lightson = function (data, schema, i) {
    var out = {};
    if(!i)
      i = 0;
    for(var key in schema) {
      if(typeof(schema[key]) == "object") {
        var inner = self.parse_lightson(data, schema[key], i);
        out[key] = inner.data;
        i = inner.len;
      } else {
        switch(schema[key]) {
          case 4:
            out[key] = data.readInt32LE(i);
            i += 4;
          break;
          case 8:
            out[key] = data.readDoubleLE(i);
            i += 8;
          break;
          default:
            console.error("error converting from binary");
        }
      }
    }

    return {data: out, len: i};
  };

  this.parse_lightson_str = function (data, schema) {
    if(!schema || !data)
      return null;
    var out = {};
    var data_arr = data.split(",");
    var i = 0;
    for(var key in schema) {
      out[key] = data_arr[i];
      i++;
    }
    return out;
  };

  //converting json to schema based comma separated structure
  this.get_lightson = function (data, schema, i) {
    var out = new Buffer(0);
    if(!i)
      i = 0;
    for(var key in schema) {
      if(typeof(schema[key]) == "object") {
        var inner = self.get_lightson(data, schema[key], i);
        out = Buffer.concat([out, inner.data]);
        i = inner.len;
      } else {
        switch(schema[key]) {
          case 4:
            var t = new Buffer(4);
            t.writeInt32LE(data[key]);
            out = Buffer.concat([out, t]);
            i += 4;
          break;
          case 8:
            t = new Buffer(8);
            t.writeDoubleLE(data[key]);
            out = Buffer.concat([out, t]);
            i += 8;
          break;
          default:
            console.error("error converting from binary");
        }
      }
    }

    return {data: out, len: i};
  };

  //send lightson encoded data (shcema-based)
  this.send_data = function (message, data, sid, on_success, on_error) {
    try {
      var dt = self.get_lightson(data, self.schemas[sid]);
      var buf = new Buffer(45 + dt.len);
      buf[0] = "d";
      buf.write(message, 1, 20);
      buf.write(sid, 21, 20);
      buf.writeInt32LE(dt.len, 41);
      dt.data.copy(buf, 45);
      self.send(buf);
      if(on_success)
        on_success();
    } catch (err) {
      if(on_error)
        on_error(err);
    }
  };

  this.send_fast = function (message, data, on_success, on_error) {
    try {
      var str = "c" + message + ":";
      var cm = false;
      for(var key in self.schemas[message]) {
        if(cm)
          str += ",";
        cm = true;
        str += data[key];
      }
      var buf = new Buffer(str);
      self.send(buf);
      if(on_success)
        on_success();
    } catch (err) {
      if(on_error)
        on_error(err);
    }
  };

  //encrypt and send data
  this.send = function (data) {
    var cipher = self.crypto.createCipheriv("AES-128-CBC", self.key, self.iv);
    var buf = Buffer.concat([cipher.update(data, "binary"), cipher.final()]);
    var blen = Buffer(5);
    blen.writeInt32LE(buf.length, 0);
    blen.writeUInt8(self.key_toggle, 4);
    self.client.write(blen, "binary");
    self.client.write(buf, "binary");
  };

  //update AES key and set decipher and chipher
  this.update_key = function (key, iv) {
    self.iv = new Buffer(iv);
    self.key = new Buffer(key);
  };

  //generate new AES key and send it to the client
  this.renew_key = function () {
    var length = 16;
    var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+_)(*&^%$#@!~}{':?><";
    var result = "";
    for (var i = length; i > 0; --i) 
      result += chars[Math.round(Math.random() * (chars.length - 1))];
    self.send("knewkey:" + result);
    self.old_key = self.key;
    self.update_key(result, self.orig_iv);
    self.key_toggle = 1 - self.key_toggle;
  };

  //remove 0s at the end of string
  this.trim_string = function (str) {
    var f = true;
    for(i = 0; i < str.length && f; i++)
      if(str.charCodeAt(i) === 0)
        f = false;
    return str.substring(0, i - 1);
  };

  //Initialize
  self.update_key(this.orig_key, this.orig_iv);
};