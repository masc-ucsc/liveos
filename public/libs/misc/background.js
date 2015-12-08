
// Global namespace
var Akm2 = Akm2 || {};

(function(window) {
    
    //"use strict";
    
    // Log
    
    (function() {

        var limit = 0;
        var count = 0;

        function logLimit(limitCount) {
            limit = limitCount < 0 ? 0 : limitCount;
        }

        function log() {
            if (limit) {
                if (limit === count) return;
                count++;
            }
            window.console.log.apply(window.console, arguments);
        }

        window.logLimit = logLimit;
        window.log = log;

    })();


    // Data type check
    
    // http://blog.livedoor.jp/dankogai/archives/51756459.html
    Akm2.typeOf = function(value) {
        if (value === null)      return 'Null';
        if (value === undefined) return 'Undefined';
        var c = value.constructor;
        return c.hasOwnProperty('name') ? c.name : ('' + c).replace(/^\s*function\s*([^\(]*)[\S\s]+$/im, '$1');
    };

    Akm2.isObject = function(value) {
        return typeof value === 'object' && value !== null;
    };

    Akm2.isNumber = function(value) {
        return typeof value === 'number';
    };
    
    Akm2.isNumeric = function(value) {
        return !isNaN(value) && isFinite(value);
    };

    Akm2.isString = function(value) {
        return typeof value === 'string';
    };

    Akm2.isFunction = function(value) {
        return typeof value === 'function';
    };

    Akm2.isArray = function(value) {
        return Object.prototype.toString.call(value) === '[object Array]';
    };

    Akm2.isNull = function(value) {
        return value === null;
    };

    Akm2.isUndefined = function(value) {
        return typeof value === 'undefined';
    };


    // Object extend

    Akm2.extend = function() {
        var target = arguments[0] || {}, o, p;

        for (var i = 1, len = arguments.length; i < len; i++) {
            o = arguments[i];

            if (!Akm2.isObject(o) || Akm2.isNull(o)) continue;

            for (p in o) {
                target[p] = o[p];
            }
        }

        return target;
    };
    
    
    // Vendor

    Akm2.Vendor = (function() {
        var vendor = {
            prefix            : '',
            transitionend     : 'transitionend',
            animationstart    : 'animationstart',
            animationend      : 'animationend',
            animationiteration: 'animationiteration',
            
            // Caution!
            // 親が window でないとダメらしい
            // 使用しているスクリプトがあるので削除しないが, 使わないこと
            requestAnimationFrame: (function(){
                return  window.requestAnimationFrame       || 
                        window.webkitRequestAnimationFrame || 
                        window.mozRequestAnimationFrame    || 
                        window.oRequestAnimationFrame      || 
                        window.msRequestAnimationFrame     || 
                        function (callback) {
                            window.setTimeout(callback, 1000 / 60);
                        };
            })(),
            cancelAnimationFrame: (function(){
                return  window.cancelAnimationFrame || window.cancelRequestAnimationFrame             ||
                        window.webkitCancelAnimationFrame || window.webkitCancelRequestAnimationFrame ||
                        window.mozCancelAnimationFrame || window.mozCancelRequestAnimationFrame       ||
                        window.oCancelAnimationFrame || window.oCancelRequestAnimationFrame           ||
                        window.msCancelAnimationFrame || window.msCancelRequestAnimationFrame         ||
                        function(id) {
                            window.clearTimeout(id);
                        };
            })(),
            
            // Test
            getProperty: function(property) {
                return this.prefix ? this.prefix + property.charAt(0).toUpperCase() + property.slice(1) : property;
            }
        };

        switch (true) {
            case (/webkit/i).test(navigator.appVersion):
                vendor.prefix = 'webkit';
                vendor.transitionend      = 'webkitTransitionEnd';
                vendor.animationstart     = 'webkitAnimationStart';
                vendor.animationend       = 'webkitAnimationEnd';
                vendor.animationiteration = 'webkitAnimationIteration';
                break;
            case (/firefox/i).test(navigator.userAgent):
                vendor.prefix = 'Moz';
                break;
            case (/msie/i).test(navigator.userAgent):
                vendor.prefix = 'ms';
                vendor.transitionend      = 'MSTransitionEnd';
                vendor.animationstart     = 'MSAnimationStart';
                vendor.animationend       = 'MSAnimationEnd';
                vendor.animationiteration = 'MSAnimationIteration';
                break;
            case 'opera' in window:
                vendor.prefix = 'O';
                vendor.transitionend      = 'oTransitionEnd'; // otransitionend
                vendor.animationstart     = 'oAnimationStart';
                vendor.animationend       = 'oAnimationEnd';
                vendor.animationiteration = 'oAnimationIteration';
                break;
            default:
                break;
        }

        return vendor;
    })();


    // Random
    
    Akm2.random = Math.random;
    
    Akm2.randUniform = function(max, min) {
        if (min === undefined) min = 0;
        return Akm2.random() * (max - min) + min;
    };
    
    Akm2.randInt = function(max, min) {
        if (min === undefined) min = 0;
        return Math.floor(Akm2.random() * (max - min + 1) + min);
    };
    
    Akm2.randomSeed = function(seed) {
        Akm2.random = !seed && seed !== 0 ? Math.random : Alea(seed).random;
    };


    /**
     * Akm2.Point
     */
    Akm2.Point = function(x, y) {
        this.set(x, y);
    };

    Akm2.Point.interpolate = function(p1, p2, f) {
        var dx = p2.x - p1.x,
            dy = p2.y - p1.y;
        return new Akm2.Point(p1.x + dx * f, p1.y + dy * f);
    };
    
    Akm2.Point.polar = function(length, angle) {
        return new Akm2.Point(length * Math.cos(angle), length * Math.sin(angle));
    };

    Akm2.Point.prototype = {
        set: function(x, y) {
            if (Akm2.isObject(x)) {
                y = x.y;
                x = x.x;
            }
        
            this.x = x || 0;
            this.y = y || 0;
        
            return this;
        },
        
        offset: function(x, y) {
            this.x += x || 0;
            this.y += y || 0;
            
            return this;
        },
        
        add: function(p) {
            this.x += p.x;
            this.y += p.y;
            
            return this;
        },
        
        sub: function(p) {
            this.x -= p.x;
            this.y -= p.y;
            
            return this;
        },
        
        scale: function(scale) {
            this.x *= scale;
            this.y *= scale;
            
            return this;
        },
        
        length: function() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        },
        
        lengthSq: function() {
            return this.x * this.x + this.y * this.y;
        },
        
        normalize: function(thickness) {
            if (Akm2.isUndefined(thickness)) thickness = 1;
            
            var len = Math.sqrt(this.x * this.x + this.y * this.y);
            var nx = 0, ny = 0;
            
            if (len) {
                nx = this.x / len;
                ny = this.y / len;
            }
            
            this.x = nx * thickness;
            this.y = ny * thickness;
            
            return this;
        },
        
        angle: function() {
            return Math.atan2(this.y, this.x);
        },
        
        angleTo: function(p) {
            var dx = p.x - this.x,
                dy = p.y - this.y;
            return Math.atan2(dy, dx);
        },
        
        distanceTo: function(p) {
            var dx = this.x - p.x,
                dy = this.y - p.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        
        distanceToSq: function(p) {
            var dx = this.x - p.x,
                dy = this.y - p.y;
            return dx * dx + dy * dy;
        },
    
        negate: function() {
            this.x *= -1;
            this.y *= -1;
            
            return this;
        },
        
        eq: function(p) {
            return this.x === p.x && this.y === p.y;
        },
        
        isEmpty: function() {
            return !this.x && !this.y;
        },
    
        clone: function() {
            return new Akm2.Point(this.x, this.y);
        },

        toArray: function() {
            return [this.x, this.y];
        },
    
        toString: function() {
            return '(x:' + this.x + ', y:' + this.y + ')';
        }
    };


    /**
     * Random generator
     * 
     * Alea, Mash function
     * @see http://baagoe.com/en/RandomMusings/javascript/
     */
    var Alea = (function() {
        
        /**
         * Mash function
         */
        function Mash() {
            var n = 0xefc8249d;
        
            return function(data) {
                data = data.toString();
                for (var i = 0, len = data.length, h; i < len; i++) {
                    n += data.charCodeAt(i);
                    h = 0.02519603282416938 * n;
                    n = h >>> 0;
                    h -= n;
                    h *= n;
                    n = h >>> 0;
                    h -= n;
                    n += h * 0x100000000;
                }
                return (n >>> 0) * 2.3283064365386963e-10;
            };
        }
        
        // Export function
        return function() {
            var seeds = arguments.length ? Array.prototype.slice.call(arguments) : [new Date().getTime()];
            
            var s0 = 0;
            var s1 = 0;
            var s2 = 0;
            var c = 1;
            
            var mash = Mash();
            s0 = mash(' ');
            s1 = mash(' ');
            s2 = mash(' ');
            for (var i = 0, len = seeds.length, seed; i < len; i++) {
                seed = seeds[i];
                s0 -= mash(seed); if (s0 < 0) s0 += 1;
                s1 -= mash(seed); if (s1 < 0) s1 += 1;
                s2 -= mash(seed); if (s2 < 0) s2 += 1;
            }
            mash = null;

            var random = function() {
                var t = 2091639 * s0 + c * 2.3283064365386963e-10;
                s0 = s1;
                s1 = s2;
                return s2 = t - (c = t | 0);
            };
            
            var uint32 = function() {
                return random() * 0x100000000;
            };
            
            var fract53 = function() {
                return random() + (random() * 0x200000 | 0) * 1.1102230246251565e-16;
            };
            
            return {
                random: random,
                uint32: uint32,
                fract53: fract53
            };
        };

    })();

    
    
    /*
     * Akm2.SimplexNoise
     * 
     * Base code jwagner's simplex-noise.js (http://github.com/jwagner/simplex-noise.js)
     * 
     * @see http://github.com/jwagner/simplex-noise.js
     * @see http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
     */
    Akm2.SimplexNoise = function(seed) {
        this.seed(seed);
    };

    Akm2.SimplexNoise.prototype = {
        octaves: 4,
        fallout: 0.5,

        _F2: 0.5 * (Math.sqrt(3.0) - 1.0),
        _G2: (3.0 - Math.sqrt(3.0)) / 6.0,
        _F3: 1.0 / 3.0,
        _G3: 1.0 / 6.0,
        _F4: (Math.sqrt(5.0) - 1.0) / 4.0,
        _G4: (5.0 - Math.sqrt(5.0)) / 20.0,

        _GRAD3: (function() {
            var grad3 = [
                1, 1, 0,   -1, 1, 0,   1, -1, 0,   -1, -1, 0,
                1, 0, 1,   -1, 0, 1,   1, 0, -1,   -1, 0, -1,
                0, 1, 1,   0, -1, 1,   0, 1, -1,   0, -1, -1
            ];
            return window.Float32Array ? new Float32Array(grad3) : grad3;
        })(),
        
        _GRAD4: (function() {
            var grad4 = [
                0, 1, 1, 1,   0, 1, 1, -1,   0, 1, -1, 1,   0, 1, -1, -1,
                0, -1, 1, 1,  0, -1, 1, -1,  0, -1, -1, 1,  0, -1, -1, -1,
                1, 0, 1, 1,   1, 0, 1, -1,   1, 0, -1, 1,   1, 0, -1, -1,
                -1, 0, 1, 1,  -1, 0, 1, -1,  -1, 0, -1, 1,  -1, 0, -1, -1,
                1, 1, 0, 1,   1, 1, 0, -1,   1, -1, 0, 1,   1, -1, 0, -1,
                -1, 1, 0, 1,  -1, 1, 0, -1,  -1, -1, 0, 1,  -1, -1, 0, -1,
                1, 1, 1, 0,   1, 1, -1, 0,   1, -1, 1, 0,   1, -1, -1, 0,
                -1, 1, 1, 0,  -1, 1, -1, 0,  -1, -1, 1, 0,  -1, -1, -1, 0
            ];
            return window.Float32Array ? new Float32Array(grad4) : grad4;
        })(),

        seed: function(seed) {
            var random = Alea(seed || new Date().getTime()).random;
            
            window.Uint8Array = window.Uint8Array || Array;

            var i;
            var p = new Uint8Array(256);
            for (i = 0; i < 256; i++) {
                p[i] = random() * 256 | 0;
            }

            var perm = new Uint8Array(512);
            var permMod12 = new Uint8Array(512);
            for (i = 0; i < 512; i++) {
                perm[i] = p[i & 255];
                permMod12[i] = perm[i] % 12;
            }

            this._perm = perm;
            this._permMod12 = permMod12;
        },

        /**
         * @see http://processingjs.org/reference/noise_/
         */
        noise: function(x, y, z, w) {
            var octaves = this.octaves;
            var fallout = this.fallout;
            var amp = 1, f = 1, sum = 0;

            var i;

            switch (arguments.length) {
                case 1  : 
                    for (i = 0; i < octaves; ++i) {
                        amp *= fallout;
                        sum += amp * (1 + this.noise2d(x * f, 0)) * 0.5;
                        f *= 2;
                    }
                    break;
                case 2  : 
                    for (i = 0; i < octaves; ++i) {
                        amp *= fallout;
                        sum += amp * (1 + this.noise2d(x * f, y * f)) * 0.5;
                        f *= 2;
                    }
                    break;
                case 3  : 
                    for (i = 0; i < octaves; ++i) {
                        amp *= fallout;
                        sum += amp * (1 + this.noise3d(x * f, y * f, z * f)) * 0.5;
                        f *= 2;
                    }
                    break;
                case 4  : 
                    for (i = 0; i < octaves; ++i) {
                        amp *= fallout;
                        sum += amp * (1 + this.noise4d(x * f, y * f, z * f, w * f)) * 0.5;
                        f *= 2;
                    }
                    break;
                default : return sum;
            }

            return sum;
        },

        noise2d: function (xin, yin) {
            var F2 = this._F2,
                G2 = this._G2,
                GRAD3 = this._GRAD3,
                perm = this._perm,
                permMod12 = this._permMod12;

            var n0, n1, n2;
            var s = (xin + yin) * F2;
            var i = (xin + s) | 0;
            var j = (yin + s) | 0;
            var t = (i + j) * G2;
            var X0 = i - t;
            var Y0 = j - t;
            var x0 = xin - X0;
            var y0 = yin - Y0;

            var i1, j1;
            if (x0 > y0) {
                i1 = 1; j1 = 0;
            } else {
                i1 = 0; j1 = 1;
            }

            var x1 = x0 - i1 + G2;
            var y1 = y0 - j1 + G2;
            var x2 = x0 - 1.0 + 2.0 * G2;
            var y2 = y0 - 1.0 + 2.0 * G2;

            var ii = i & 255;
            var jj = j & 255;

            var t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 < 0) {
                n0 = 0.0;
            } else {
                var gi0 = permMod12[ii + perm[jj]] * 3;
                t0 *= t0;
                n0 = t0 * t0 * (GRAD3[gi0] * x0 + GRAD3[gi0 + 1] * y0);
            }
            var t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 < 0) {
                n1 = 0.0;
            } else {
                var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
                t1 *= t1;
                n1 = t1 * t1 * (GRAD3[gi1] * x1 + GRAD3[gi1 + 1] * y1);
            }
            var t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 < 0) {
                n2 = 0.0;
            } else {
                var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
                t2 *= t2;
                n2 = t2 * t2 * (GRAD3[gi2] * x2 + GRAD3[gi2 + 1] * y2);
            }

            return 70.0 * (n0 + n1 + n2);
        },

        noise3d: function (xin, yin, zin) {
            var F3 = this._F3,
                G3 = this._G3,
                GRAD3 = this._GRAD3,
                perm = this._perm,
                permMod12 = this._permMod12;

            var n0, n1, n2, n3;

            var s = (xin + yin + zin) * F3;
            var i = (xin + s) | 0;
            var j = (yin + s) | 0;
            var k = (zin + s) | 0;
            var t = (i + j + k) * G3;
            var X0 = i - t;
            var Y0 = j - t;
            var Z0 = k - t;
            var x0 = xin - X0;
            var y0 = yin - Y0;
            var z0 = zin - Z0;

            var i1, j1, k1;
            var i2, j2, k2;
            if (x0 >= y0) {
                if (y0 >= z0) {
                    i1 = 1; j1 = 0; k1 = 0;
                    i2 = 1; j2 = 1; k2 = 0;
                } else if (x0 >= z0) {
                    i1 = 1; j1 = 0; k1 = 0;
                    i2 = 1; j2 = 0; k2 = 1;
                } else {
                    i1 = 0; j1 = 0; k1 = 1;
                    i2 = 1; j2 = 0; k2 = 1;
                }
            } else {
                if (y0 < z0) {
                    i1 = 0; j1 = 0; k1 = 1;
                    i2 = 0; j2 = 1; k2 = 1;
                } else if (x0 < z0) {
                    i1 = 0; j1 = 1; k1 = 0;
                    i2 = 0; j2 = 1; k2 = 1;
                } else {
                    i1 = 0; j1 = 1; k1 = 0;
                    i2 = 1; j2 = 1; k2 = 0;
                }
            }

            var x1 = x0 - i1 + G3;
            var y1 = y0 - j1 + G3;
            var z1 = z0 - k1 + G3;
            var x2 = x0 - i2 + 2.0 * G3;
            var y2 = y0 - j2 + 2.0 * G3;
            var z2 = z0 - k2 + 2.0 * G3;
            var x3 = x0 - 1.0 + 3.0 * G3;
            var y3 = y0 - 1.0 + 3.0 * G3;
            var z3 = z0 - 1.0 + 3.0 * G3;

            var ii = i & 255;
            var jj = j & 255;
            var kk = k & 255;

            var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
            if (t0 < 0) {
                n0 = 0.0;
            } else {
                var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
                t0 *= t0;
                n0 = t0 * t0 * (GRAD3[gi0] * x0 + GRAD3[gi0 + 1] * y0 + GRAD3[gi0 + 2] * z0);
            }
            var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
            if (t1 < 0) {
                n1 = 0.0;
            } else {
                var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
                t1 *= t1;
                n1 = t1 * t1 * (GRAD3[gi1] * x1 + GRAD3[gi1 + 1] * y1 + GRAD3[gi1 + 2] * z1);
            }
            var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
            if (t2 < 0) {
                n2 = 0.0;
            } else {
                var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
                t2 *= t2;
                n2 = t2 * t2 * (GRAD3[gi2] * x2 + GRAD3[gi2 + 1] * y2 + GRAD3[gi2 + 2] * z2);
            }
            var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
            if (t3 < 0) {
                n3 = 0.0;
            } else {
                var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
                t3 *= t3;
                n3 = t3 * t3 * (GRAD3[gi3] * x3 + GRAD3[gi3 + 1] * y3 + GRAD3[gi3 + 2] * z3);
            }

            return 32.0 * (n0 + n1 + n2 + n3);
        },

        noise4d: function (x, y, z, w) {
            var F4 = this._F4,
                G4 = this._G4,
                GRAD4 = this._GRAD4,
                perm = this._perm,
                permMod12 = this._permMod12;

            var n0, n1, n2, n3, n4;

            var s = (x + y + z + w) * F4;
            var i = (x + s) | 0;
            var j = (y + s) | 0;
            var k = (z + s) | 0;
            var l = (w + s) | 0;
            var t = (i + j + k + l) * G4;
            var X0 = i - t;
            var Y0 = j - t;
            var Z0 = k - t;
            var W0 = l - t;
            var x0 = x - X0;
            var y0 = y - Y0;
            var z0 = z - Z0;
            var w0 = w - W0;

            var rankx = 0, ranky = 0, rankz = 0, rankw = 0;
            if (x0 > y0) rankx++;
            else ranky++;
            if (x0 > z0) rankx++;
            else rankz++;
            if (x0 > w0) rankx++;
            else rankw++;
            if (y0 > z0) ranky++;
            else rankz++;
            if (y0 > w0) ranky++;
            else rankw++;
            if (z0 > w0) rankz++;
            else rankw++;
            var i1, j1, k1, l1;
            var i2, j2, k2, l2;
            var i3, j3, k3, l3;

            i1 = rankx >= 3 ? 1 : 0;
            j1 = ranky >= 3 ? 1 : 0;
            k1 = rankz >= 3 ? 1 : 0;
            l1 = rankw >= 3 ? 1 : 0;

            i2 = rankx >= 2 ? 1 : 0;
            j2 = ranky >= 2 ? 1 : 0;
            k2 = rankz >= 2 ? 1 : 0;
            l2 = rankw >= 2 ? 1 : 0;

            i3 = rankx >= 1 ? 1 : 0;
            j3 = ranky >= 1 ? 1 : 0;
            k3 = rankz >= 1 ? 1 : 0;
            l3 = rankw >= 1 ? 1 : 0;

            var x1 = x0 - i1 + G4;
            var y1 = y0 - j1 + G4;
            var z1 = z0 - k1 + G4;
            var w1 = w0 - l1 + G4;
            var x2 = x0 - i2 + 2.0 * G4;
            var y2 = y0 - j2 + 2.0 * G4;
            var z2 = z0 - k2 + 2.0 * G4;
            var w2 = w0 - l2 + 2.0 * G4;
            var x3 = x0 - i3 + 3.0 * G4;
            var y3 = y0 - j3 + 3.0 * G4;
            var z3 = z0 - k3 + 3.0 * G4;
            var w3 = w0 - l3 + 3.0 * G4;
            var x4 = x0 - 1.0 + 4.0 * G4;
            var y4 = y0 - 1.0 + 4.0 * G4;
            var z4 = z0 - 1.0 + 4.0 * G4;
            var w4 = w0 - 1.0 + 4.0 * G4;

            var ii = i & 255;
            var jj = j & 255;
            var kk = k & 255;
            var ll = l & 255;

            var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
            if (t0 < 0) {
                n0 = 0.0;
            } else {
                var gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
                t0 *= t0;
                n0 = t0 * t0 * ( GRAD4[gi0] * x0 +  GRAD4[gi0 + 1] * y0 +  GRAD4[gi0 + 2] * z0 +  GRAD4[gi0 + 3] * w0);
            }
            var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
            if (t1 < 0) {
                n1 = 0.0;
            } else {
                var gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
                t1 *= t1;
                n1 = t1 * t1 * ( GRAD4[gi1] * x1 +  GRAD4[gi1 + 1] * y1 +  GRAD4[gi1 + 2] * z1 +  GRAD4[gi1 + 3] * w1);
            }
            var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
            if (t2 < 0) {
                n2 = 0.0;
            } else {
                var gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
                t2 *= t2;
                n2 = t2 * t2 * ( GRAD4[gi2] * x2 +  GRAD4[gi2 + 1] * y2 +  GRAD4[gi2 + 2] * z2 +  GRAD4[gi2 + 3] * w2);
            }
            var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
            if (t3 < 0) {
                n3 = 0.0;
            } else {
                var gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
                t3 *= t3;
                n3 = t3 * t3 * ( GRAD4[gi3] * x3 +  GRAD4[gi3 + 1] * y3 +  GRAD4[gi3 + 2] * z3 +  GRAD4[gi3 + 3] * w3);
            }
            var t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
            if (t4 < 0) {
                n4 = 0.0;
            } else {
                var gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
                t4 *= t4;
                n4 = t4 * t4 * ( GRAD4[gi4] * x4 +  GRAD4[gi4 + 1] * y4 +  GRAD4[gi4 + 2] * z4 +  GRAD4[gi4 + 3] * w4);
            }

            return 27.0 * (n0 + n1 + n2 + n3 + n4);
        }


    };

})(window);
