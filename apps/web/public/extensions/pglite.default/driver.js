
// This file is bundled for browser use
// All dependencies including @qwery/extensions-sdk and @qwery/domain are bundled

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn2, res) => function __init() {
  return fn2 && (res = (0, fn2[__getOwnPropNames(fn2)[0]])(fn2 = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i3 = decorators.length - 1, decorator; i3 >= 0; i3--)
    if (decorator = decorators[i3])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/chunk-QY3QWFKW.js
var p, i2, c, f, l, s, a, _, d, D, F, g, L, P, n, h, R, x, T, U, u;
var init_chunk_QY3QWFKW = __esm({
  "node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/chunk-QY3QWFKW.js"() {
    p = Object.create;
    i2 = Object.defineProperty;
    c = Object.getOwnPropertyDescriptor;
    f = Object.getOwnPropertyNames;
    l = Object.getPrototypeOf;
    s = Object.prototype.hasOwnProperty;
    a = (t2) => {
      throw TypeError(t2);
    };
    _ = (t2, e, o4) => e in t2 ? i2(t2, e, { enumerable: true, configurable: true, writable: true, value: o4 }) : t2[e] = o4;
    d = (t2, e) => () => (t2 && (e = t2(t2 = 0)), e);
    D = (t2, e) => () => (e || t2((e = { exports: {} }).exports, e), e.exports);
    F = (t2, e) => {
      for (var o4 in e) i2(t2, o4, { get: e[o4], enumerable: true });
    };
    g = (t2, e, o4, m4) => {
      if (e && typeof e == "object" || typeof e == "function") for (let r of f(e)) !s.call(t2, r) && r !== o4 && i2(t2, r, { get: () => e[r], enumerable: !(m4 = c(e, r)) || m4.enumerable });
      return t2;
    };
    L = (t2, e, o4) => (o4 = t2 != null ? p(l(t2)) : {}, g(e || !t2 || !t2.__esModule ? i2(o4, "default", { value: t2, enumerable: true }) : o4, t2));
    P = (t2, e, o4) => _(t2, typeof e != "symbol" ? e + "" : e, o4);
    n = (t2, e, o4) => e.has(t2) || a("Cannot " + o4);
    h = (t2, e, o4) => (n(t2, e, "read from private field"), o4 ? o4.call(t2) : e.get(t2));
    R = (t2, e, o4) => e.has(t2) ? a("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t2) : e.set(t2, o4);
    x = (t2, e, o4, m4) => (n(t2, e, "write to private field"), m4 ? m4.call(t2, o4) : e.set(t2, o4), o4);
    T = (t2, e, o4) => (n(t2, e, "access private method"), o4);
    U = (t2, e, o4, m4) => ({ set _(r) {
      x(t2, e, r, o4);
    }, get _() {
      return h(t2, e, m4);
    } });
    u = d(() => {
      "use strict";
    });
  }
});

// (disabled):fs/promises
var require_promises = __commonJS({
  "(disabled):fs/promises"() {
  }
});

// (disabled):node_modules/.pnpm/util@0.12.5/node_modules/util/util.js
var require_util = __commonJS({
  "(disabled):node_modules/.pnpm/util@0.12.5/node_modules/util/util.js"() {
  }
});

// (disabled):zlib
var require_zlib = __commonJS({
  "(disabled):zlib"() {
  }
});

// node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/chunk-VBDAOXYI.js
async function H2(r, e, t2 = "pgdata", s4 = "auto") {
  let a2 = Br(r, e), [n3, o4] = await qr(a2, s4), i3 = t2 + (o4 ? ".tar.gz" : ".tar"), u2 = o4 ? "application/x-gzip" : "application/x-tar";
  return typeof File < "u" ? new File([n3], i3, { type: u2 }) : new Blob([n3], { type: u2 });
}
async function ce2(r, e, t2) {
  let s4 = new Uint8Array(await e.arrayBuffer()), a2 = typeof File < "u" && e instanceof File ? e.name : void 0;
  (Hr.includes(e.type) || a2?.endsWith(".tgz") || a2?.endsWith(".tar.gz")) && (s4 = await ar(s4));
  let o4;
  try {
    o4 = (0, g4.untar)(s4);
  } catch (i3) {
    if (i3 instanceof Error && i3.message.includes("File is corrupted")) s4 = await ar(s4), o4 = (0, g4.untar)(s4);
    else throw i3;
  }
  for (let i3 of o4) {
    let u2 = t2 + i3.name, c2 = u2.split("/").slice(0, -1);
    for (let m4 = 1; m4 <= c2.length; m4++) {
      let y4 = c2.slice(0, m4).join("/");
      r.analyzePath(y4).exists || r.mkdir(y4);
    }
    i3.type === g4.REGTYPE ? (r.writeFile(u2, i3.data), r.utime(u2, sr(i3.modifyTime), sr(i3.modifyTime))) : i3.type === g4.DIRTYPE && r.mkdir(u2);
  }
}
function jr(r, e) {
  let t2 = [], s4 = (a2) => {
    r.readdir(a2).forEach((o4) => {
      if (o4 === "." || o4 === "..") return;
      let i3 = a2 + "/" + o4, u2 = r.stat(i3), c2 = r.isFile(u2.mode) ? r.readFile(i3, { encoding: "binary" }) : new Uint8Array(0);
      t2.push({ name: i3.substring(e.length), mode: u2.mode, size: u2.size, type: r.isFile(u2.mode) ? g4.REGTYPE : g4.DIRTYPE, modifyTime: u2.mtime, data: c2 }), r.isDir(u2.mode) && s4(i3);
    });
  };
  return s4(e), t2;
}
function Br(r, e) {
  let t2 = jr(r, e);
  return (0, g4.tar)(t2);
}
async function qr(r, e = "auto") {
  if (e === "none") return [r, false];
  if (typeof CompressionStream < "u") return [await Yr(r), true];
  if (typeof process < "u" && process.versions && process.versions.node) return [await Wr(r), true];
  if (e === "auto") return [r, false];
  throw new Error("Compression not supported in this environment");
}
async function Yr(r) {
  let e = new CompressionStream("gzip"), t2 = e.writable.getWriter(), s4 = e.readable.getReader();
  t2.write(r), t2.close();
  let a2 = [];
  for (; ; ) {
    let { value: i3, done: u2 } = await s4.read();
    if (u2) break;
    i3 && a2.push(i3);
  }
  let n3 = new Uint8Array(a2.reduce((i3, u2) => i3 + u2.length, 0)), o4 = 0;
  return a2.forEach((i3) => {
    n3.set(i3, o4), o4 += i3.length;
  }), n3;
}
async function Wr(r) {
  let { promisify: e } = await Promise.resolve().then(() => __toESM(require_util(), 1)), { gzip: t2 } = await Promise.resolve().then(() => __toESM(require_zlib(), 1));
  return await e(t2)(r);
}
async function ar(r) {
  if (typeof CompressionStream < "u") return await Xr(r);
  if (typeof process < "u" && process.versions && process.versions.node) return await Kr(r);
  throw new Error("Unsupported environment for decompression");
}
async function Xr(r) {
  let e = new DecompressionStream("gzip"), t2 = e.writable.getWriter(), s4 = e.readable.getReader();
  t2.write(r), t2.close();
  let a2 = [];
  for (; ; ) {
    let { value: i3, done: u2 } = await s4.read();
    if (u2) break;
    i3 && a2.push(i3);
  }
  let n3 = new Uint8Array(a2.reduce((i3, u2) => i3 + u2.length, 0)), o4 = 0;
  return a2.forEach((i3) => {
    n3.set(i3, o4), o4 += i3.length;
  }), n3;
}
async function Kr(r) {
  let { promisify: e } = await Promise.resolve().then(() => __toESM(require_util(), 1)), { gunzip: t2 } = await Promise.resolve().then(() => __toESM(require_zlib(), 1));
  return await e(t2)(r);
}
function sr(r) {
  return r ? typeof r == "number" ? r : Math.floor(r.getTime() / 1e3) : Math.floor(Date.now() / 1e3);
}
var w2, x4, L3, er, nr, or, g4, Hr, Vr, C2, ur, cr, pr, Zr;
var init_chunk_VBDAOXYI = __esm({
  "node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/chunk-VBDAOXYI.js"() {
    init_chunk_QY3QWFKW();
    w2 = D(($r, l3) => {
      "use strict";
      u();
      var j3 = 9007199254740991, B2 = /* @__PURE__ */ (function(r) {
        return r;
      })();
      function mr(r) {
        return r === B2;
      }
      function q3(r) {
        return typeof r == "string" || Object.prototype.toString.call(r) == "[object String]";
      }
      function lr(r) {
        return Object.prototype.toString.call(r) == "[object Date]";
      }
      function N2(r) {
        return r !== null && typeof r == "object";
      }
      function U3(r) {
        return typeof r == "function";
      }
      function fr(r) {
        return typeof r == "number" && r > -1 && r % 1 == 0 && r <= j3;
      }
      function yr(r) {
        return Object.prototype.toString.call(r) == "[object Array]";
      }
      function Y3(r) {
        return N2(r) && !U3(r) && fr(r.length);
      }
      function D4(r) {
        return Object.prototype.toString.call(r) == "[object ArrayBuffer]";
      }
      function gr(r, e) {
        return Array.prototype.map.call(r, e);
      }
      function hr(r, e) {
        var t2 = B2;
        return U3(e) && Array.prototype.every.call(r, function(s4, a2, n3) {
          var o4 = e(s4, a2, n3);
          return o4 && (t2 = s4), !o4;
        }), t2;
      }
      function Sr(r) {
        return Object.assign.apply(null, arguments);
      }
      function W3(r) {
        var e, t2, s4;
        if (q3(r)) {
          for (t2 = r.length, s4 = new Uint8Array(t2), e = 0; e < t2; e++) s4[e] = r.charCodeAt(e) & 255;
          return s4;
        }
        return D4(r) ? new Uint8Array(r) : N2(r) && D4(r.buffer) ? new Uint8Array(r.buffer) : Y3(r) ? new Uint8Array(r) : N2(r) && U3(r.toString) ? W3(r.toString()) : new Uint8Array();
      }
      l3.exports.MAX_SAFE_INTEGER = j3;
      l3.exports.isUndefined = mr;
      l3.exports.isString = q3;
      l3.exports.isObject = N2;
      l3.exports.isDateTime = lr;
      l3.exports.isFunction = U3;
      l3.exports.isArray = yr;
      l3.exports.isArrayLike = Y3;
      l3.exports.isArrayBuffer = D4;
      l3.exports.map = gr;
      l3.exports.find = hr;
      l3.exports.extend = Sr;
      l3.exports.toUint8Array = W3;
    });
    x4 = D((Qr, X2) => {
      "use strict";
      u();
      var M2 = "\0";
      X2.exports = { NULL_CHAR: M2, TMAGIC: "ustar" + M2 + "00", OLDGNU_MAGIC: "ustar  " + M2, REGTYPE: 0, LNKTYPE: 1, SYMTYPE: 2, CHRTYPE: 3, BLKTYPE: 4, DIRTYPE: 5, FIFOTYPE: 6, CONTTYPE: 7, TSUID: parseInt("4000", 8), TSGID: parseInt("2000", 8), TSVTX: parseInt("1000", 8), TUREAD: parseInt("0400", 8), TUWRITE: parseInt("0200", 8), TUEXEC: parseInt("0100", 8), TGREAD: parseInt("0040", 8), TGWRITE: parseInt("0020", 8), TGEXEC: parseInt("0010", 8), TOREAD: parseInt("0004", 8), TOWRITE: parseInt("0002", 8), TOEXEC: parseInt("0001", 8), TPERMALL: parseInt("0777", 8), TPERMMASK: parseInt("0777", 8) };
    });
    L3 = D((ee2, f3) => {
      "use strict";
      u();
      var K3 = w2(), p4 = x4(), Fr = 512, I3 = p4.TPERMALL, V2 = 0, Z3 = 0, _3 = [["name", 100, 0, function(r, e) {
        return v3(r[e[0]], e[1]);
      }, function(r, e, t2) {
        return A2(r.slice(e, e + t2[1]));
      }], ["mode", 8, 100, function(r, e) {
        var t2 = r[e[0]] || I3;
        return t2 = t2 & p4.TPERMMASK, P4(t2, e[1], I3);
      }, function(r, e, t2) {
        var s4 = S3(r.slice(e, e + t2[1]));
        return s4 &= p4.TPERMMASK, s4;
      }], ["uid", 8, 108, function(r, e) {
        return P4(r[e[0]], e[1], V2);
      }, function(r, e, t2) {
        return S3(r.slice(e, e + t2[1]));
      }], ["gid", 8, 116, function(r, e) {
        return P4(r[e[0]], e[1], Z3);
      }, function(r, e, t2) {
        return S3(r.slice(e, e + t2[1]));
      }], ["size", 12, 124, function(r, e) {
        return P4(r.data.length, e[1]);
      }, function(r, e, t2) {
        return S3(r.slice(e, e + t2[1]));
      }], ["modifyTime", 12, 136, function(r, e) {
        return k4(r[e[0]], e[1]);
      }, function(r, e, t2) {
        return z2(r.slice(e, e + t2[1]));
      }], ["checksum", 8, 148, function(r, e) {
        return "        ";
      }, function(r, e, t2) {
        return S3(r.slice(e, e + t2[1]));
      }], ["type", 1, 156, function(r, e) {
        return "" + (parseInt(r[e[0]], 10) || 0) % 8;
      }, function(r, e, t2) {
        return (parseInt(String.fromCharCode(r[e]), 10) || 0) % 8;
      }], ["linkName", 100, 157, function(r, e) {
        return "";
      }, function(r, e, t2) {
        return A2(r.slice(e, e + t2[1]));
      }], ["ustar", 8, 257, function(r, e) {
        return p4.TMAGIC;
      }, function(r, e, t2) {
        return br(A2(r.slice(e, e + t2[1]), true));
      }, function(r, e) {
        return r[e[0]] == p4.TMAGIC || r[e[0]] == p4.OLDGNU_MAGIC;
      }], ["owner", 32, 265, function(r, e) {
        return v3(r[e[0]], e[1]);
      }, function(r, e, t2) {
        return A2(r.slice(e, e + t2[1]));
      }], ["group", 32, 297, function(r, e) {
        return v3(r[e[0]], e[1]);
      }, function(r, e, t2) {
        return A2(r.slice(e, e + t2[1]));
      }], ["majorNumber", 8, 329, function(r, e) {
        return "";
      }, function(r, e, t2) {
        return S3(r.slice(e, e + t2[1]));
      }], ["minorNumber", 8, 337, function(r, e) {
        return "";
      }, function(r, e, t2) {
        return S3(r.slice(e, e + t2[1]));
      }], ["prefix", 131, 345, function(r, e) {
        return v3(r[e[0]], e[1]);
      }, function(r, e, t2) {
        return A2(r.slice(e, e + t2[1]));
      }], ["accessTime", 12, 476, function(r, e) {
        return k4(r[e[0]], e[1]);
      }, function(r, e, t2) {
        return z2(r.slice(e, e + t2[1]));
      }], ["createTime", 12, 488, function(r, e) {
        return k4(r[e[0]], e[1]);
      }, function(r, e, t2) {
        return z2(r.slice(e, e + t2[1]));
      }]], $4 = (function(r) {
        var e = r[r.length - 1];
        return e[2] + e[1];
      })(_3);
      function br(r) {
        if (r.length == 8) {
          var e = r.split("");
          if (e[5] == p4.NULL_CHAR) return (e[6] == " " || e[6] == p4.NULL_CHAR) && (e[6] = "0"), (e[7] == " " || e[7] == p4.NULL_CHAR) && (e[7] = "0"), e = e.join(""), e == p4.TMAGIC ? e : r;
          if (e[7] == p4.NULL_CHAR) return e[5] == p4.NULL_CHAR && (e[5] = " "), e[6] == p4.NULL_CHAR && (e[6] = " "), e == p4.OLDGNU_MAGIC ? e : r;
        }
        return r;
      }
      function v3(r, e) {
        return e -= 1, K3.isUndefined(r) && (r = ""), r = ("" + r).substr(0, e), r + p4.NULL_CHAR;
      }
      function P4(r, e, t2) {
        for (t2 = parseInt(t2) || 0, e -= 1, r = (parseInt(r) || t2).toString(8).substr(-e, e); r.length < e; ) r = "0" + r;
        return r + p4.NULL_CHAR;
      }
      function k4(r, e) {
        if (K3.isDateTime(r)) r = Math.floor(1 * r / 1e3);
        else if (r = parseInt(r, 10), isFinite(r)) {
          if (r <= 0) return "";
        } else r = Math.floor(1 * /* @__PURE__ */ new Date() / 1e3);
        return P4(r, e, 0);
      }
      function A2(r, e) {
        var t2 = String.fromCharCode.apply(null, r);
        if (e) return t2;
        var s4 = t2.indexOf(p4.NULL_CHAR);
        return s4 >= 0 ? t2.substr(0, s4) : t2;
      }
      function S3(r) {
        var e = String.fromCharCode.apply(null, r);
        return parseInt(e.replace(/^0+$/g, ""), 8) || 0;
      }
      function z2(r) {
        return r.length == 0 || r[0] == 0 ? null : new Date(1e3 * S3(r));
      }
      function Tr2(r, e, t2) {
        var s4 = parseInt(e, 10) || 0, a2 = Math.min(s4 + $4, r.length), n3 = 0, o4 = 0, i3 = 0;
        t2 && _3.every(function(y4) {
          return y4[0] == "checksum" ? (o4 = s4 + y4[2], i3 = o4 + y4[1], false) : true;
        });
        for (var u2 = 32, c2 = s4; c2 < a2; c2++) {
          var m4 = c2 >= o4 && c2 < i3 ? u2 : r[c2];
          n3 = (n3 + m4) % 262144;
        }
        return n3;
      }
      f3.exports.recordSize = Fr;
      f3.exports.defaultFileMode = I3;
      f3.exports.defaultUid = V2;
      f3.exports.defaultGid = Z3;
      f3.exports.posixHeader = _3;
      f3.exports.effectiveHeaderSize = $4;
      f3.exports.calculateChecksum = Tr2;
      f3.exports.formatTarString = v3;
      f3.exports.formatTarNumber = P4;
      f3.exports.formatTarDateTime = k4;
      f3.exports.parseTarString = A2;
      f3.exports.parseTarNumber = S3;
      f3.exports.parseTarDateTime = z2;
    });
    er = D((ne3, rr) => {
      "use strict";
      u();
      var Ar = x4(), O5 = w2(), F4 = L3();
      function J3(r) {
        return F4.recordSize;
      }
      function Q3(r) {
        return Math.ceil(r.data.length / F4.recordSize) * F4.recordSize;
      }
      function Er2(r) {
        var e = 0;
        return r.forEach(function(t2) {
          e += J3(t2) + Q3(t2);
        }), e += F4.recordSize * 2, new Uint8Array(e);
      }
      function Pr2(r, e, t2) {
        t2 = parseInt(t2) || 0;
        var s4 = t2;
        F4.posixHeader.forEach(function(u2) {
          for (var c2 = u2[3](e, u2), m4 = c2.length, y4 = 0; y4 < m4; y4 += 1) r[s4 + y4] = c2.charCodeAt(y4) & 255;
          s4 += u2[1];
        });
        var a2 = O5.find(F4.posixHeader, function(u2) {
          return u2[0] == "checksum";
        });
        if (a2) {
          var n3 = F4.calculateChecksum(r, t2, true), o4 = F4.formatTarNumber(n3, a2[1] - 2) + Ar.NULL_CHAR + " ";
          s4 = t2 + a2[2];
          for (var i3 = 0; i3 < o4.length; i3 += 1) r[s4] = o4.charCodeAt(i3) & 255, s4++;
        }
        return t2 + J3(e);
      }
      function wr(r, e, t2) {
        return t2 = parseInt(t2, 10) || 0, r.set(e.data, t2), t2 + Q3(e);
      }
      function xr(r) {
        r = O5.map(r, function(s4) {
          return O5.extend({}, s4, { data: O5.toUint8Array(s4.data) });
        });
        var e = Er2(r), t2 = 0;
        return r.forEach(function(s4) {
          t2 = Pr2(e, s4, t2), t2 = wr(e, s4, t2);
        }), e;
      }
      rr.exports.tar = xr;
    });
    nr = D((oe2, tr) => {
      "use strict";
      u();
      var vr = x4(), G4 = w2(), h3 = L3(), Nr2 = { extractData: true, checkHeader: true, checkChecksum: true, checkFileSize: true }, Ur = { size: true, checksum: true, ustar: true }, R3 = { unexpectedEndOfFile: "Unexpected end of file.", fileCorrupted: "File is corrupted.", checksumCheckFailed: "Checksum check failed." };
      function kr(r) {
        return h3.recordSize;
      }
      function zr(r) {
        return Math.ceil(r / h3.recordSize) * h3.recordSize;
      }
      function Or(r, e) {
        for (var t2 = e, s4 = Math.min(r.length, e + h3.recordSize * 2), a2 = t2; a2 < s4; a2++) if (r[a2] != 0) return false;
        return true;
      }
      function Cr2(r, e, t2) {
        if (r.length - e < h3.recordSize) {
          if (t2.checkFileSize) throw new Error(R3.unexpectedEndOfFile);
          return null;
        }
        e = parseInt(e) || 0;
        var s4 = {}, a2 = e;
        if (h3.posixHeader.forEach(function(i3) {
          s4[i3[0]] = i3[4](r, a2, i3), a2 += i3[1];
        }), s4.type != 0 && (s4.size = 0), t2.checkHeader && h3.posixHeader.forEach(function(i3) {
          if (G4.isFunction(i3[5]) && !i3[5](s4, i3)) {
            var u2 = new Error(R3.fileCorrupted);
            throw u2.data = { offset: e + i3[2], field: i3[0] }, u2;
          }
        }), t2.checkChecksum) {
          var n3 = h3.calculateChecksum(r, e, true);
          if (n3 != s4.checksum) {
            var o4 = new Error(R3.checksumCheckFailed);
            throw o4.data = { offset: e, header: s4, checksum: n3 }, o4;
          }
        }
        return s4;
      }
      function Dr(r, e, t2, s4) {
        return s4.extractData ? t2.size <= 0 ? new Uint8Array() : r.slice(e, e + t2.size) : null;
      }
      function Mr(r, e) {
        var t2 = {};
        return h3.posixHeader.forEach(function(s4) {
          var a2 = s4[0];
          Ur[a2] || (t2[a2] = r[a2]);
        }), t2.isOldGNUFormat = r.ustar == vr.OLDGNU_MAGIC, e && (t2.data = e), t2;
      }
      function Ir(r, e) {
        e = G4.extend({}, Nr2, e);
        for (var t2 = [], s4 = 0, a2 = r.length; a2 - s4 >= h3.recordSize; ) {
          r = G4.toUint8Array(r);
          var n3 = Cr2(r, s4, e);
          if (!n3) break;
          s4 += kr(n3);
          var o4 = Dr(r, s4, n3, e);
          if (t2.push(Mr(n3, o4)), s4 += zr(n3.size), Or(r, s4)) break;
        }
        return t2;
      }
      tr.exports.untar = Ir;
    });
    or = D((se3, ir) => {
      "use strict";
      u();
      var _r = w2(), Lr = x4(), Rr2 = er(), Gr = nr();
      _r.extend(ir.exports, Rr2, Gr, Lr);
    });
    u();
    u();
    g4 = L(or(), 1);
    Hr = ["application/x-gtar", "application/x-tar+gzip", "application/x-gzip", "application/gzip"];
    Vr = "/tmp/pglite";
    C2 = Vr + "/base";
    ur = class {
      constructor(e) {
        this.dataDir = e;
      }
      async init(e, t2) {
        return this.pg = e, { emscriptenOpts: t2 };
      }
      async syncToFs(e) {
      }
      async initialSyncFs() {
      }
      async closeFs() {
      }
      async dumpTar(e, t2) {
        return H2(this.pg.Module.FS, C2, e, t2);
      }
    };
    cr = class {
      constructor(e, { debug: t2 = false } = {}) {
        this.dataDir = e, this.debug = t2;
      }
      async syncToFs(e) {
      }
      async initialSyncFs() {
      }
      async closeFs() {
      }
      async dumpTar(e, t2) {
        return H2(this.pg.Module.FS, C2, e, t2);
      }
      async init(e, t2) {
        return this.pg = e, { emscriptenOpts: { ...t2, preRun: [...t2.preRun || [], (a2) => {
          let n3 = Zr(a2, this);
          a2.FS.mkdir(C2), a2.FS.mount(n3, {}, C2);
        }] } };
      }
    };
    pr = { EBADF: 8, EBADFD: 127, EEXIST: 20, EINVAL: 28, EISDIR: 31, ENODEV: 43, ENOENT: 44, ENOTDIR: 54, ENOTEMPTY: 55 };
    Zr = (r, e) => {
      let t2 = r.FS, s4 = e.debug ? console.log : null, a2 = { tryFSOperation(n3) {
        try {
          return n3();
        } catch (o4) {
          throw o4.code ? o4.code === "UNKNOWN" ? new t2.ErrnoError(pr.EINVAL) : new t2.ErrnoError(o4.code) : o4;
        }
      }, mount(n3) {
        return a2.createNode(null, "/", 16895, 0);
      }, syncfs(n3, o4, i3) {
      }, createNode(n3, o4, i3, u2) {
        if (!t2.isDir(i3) && !t2.isFile(i3)) throw new t2.ErrnoError(28);
        let c2 = t2.createNode(n3, o4, i3);
        return c2.node_ops = a2.node_ops, c2.stream_ops = a2.stream_ops, c2;
      }, getMode: function(n3) {
        return s4?.("getMode", n3), a2.tryFSOperation(() => e.lstat(n3).mode);
      }, realPath: function(n3) {
        let o4 = [];
        for (; n3.parent !== n3; ) o4.push(n3.name), n3 = n3.parent;
        return o4.push(n3.mount.opts.root), o4.reverse(), o4.join("/");
      }, node_ops: { getattr(n3) {
        s4?.("getattr", a2.realPath(n3));
        let o4 = a2.realPath(n3);
        return a2.tryFSOperation(() => {
          let i3 = e.lstat(o4);
          return { ...i3, dev: 0, ino: n3.id, nlink: 1, rdev: n3.rdev, atime: new Date(i3.atime), mtime: new Date(i3.mtime), ctime: new Date(i3.ctime) };
        });
      }, setattr(n3, o4) {
        s4?.("setattr", a2.realPath(n3), o4);
        let i3 = a2.realPath(n3);
        a2.tryFSOperation(() => {
          o4.mode !== void 0 && e.chmod(i3, o4.mode), o4.size !== void 0 && e.truncate(i3, o4.size), o4.timestamp !== void 0 && e.utimes(i3, o4.timestamp, o4.timestamp), o4.size !== void 0 && e.truncate(i3, o4.size);
        });
      }, lookup(n3, o4) {
        s4?.("lookup", a2.realPath(n3), o4);
        let i3 = [a2.realPath(n3), o4].join("/"), u2 = a2.getMode(i3);
        return a2.createNode(n3, o4, u2);
      }, mknod(n3, o4, i3, u2) {
        s4?.("mknod", a2.realPath(n3), o4, i3, u2);
        let c2 = a2.createNode(n3, o4, i3, u2), m4 = a2.realPath(c2);
        return a2.tryFSOperation(() => (t2.isDir(c2.mode) ? e.mkdir(m4, { mode: i3 }) : e.writeFile(m4, "", { mode: i3 }), c2));
      }, rename(n3, o4, i3) {
        s4?.("rename", a2.realPath(n3), a2.realPath(o4), i3);
        let u2 = a2.realPath(n3), c2 = [a2.realPath(o4), i3].join("/");
        a2.tryFSOperation(() => {
          e.rename(u2, c2);
        }), n3.name = i3;
      }, unlink(n3, o4) {
        s4?.("unlink", a2.realPath(n3), o4);
        let i3 = [a2.realPath(n3), o4].join("/");
        try {
          e.unlink(i3);
        } catch {
        }
      }, rmdir(n3, o4) {
        s4?.("rmdir", a2.realPath(n3), o4);
        let i3 = [a2.realPath(n3), o4].join("/");
        return a2.tryFSOperation(() => {
          e.rmdir(i3);
        });
      }, readdir(n3) {
        s4?.("readdir", a2.realPath(n3));
        let o4 = a2.realPath(n3);
        return a2.tryFSOperation(() => e.readdir(o4));
      }, symlink(n3, o4, i3) {
        throw s4?.("symlink", a2.realPath(n3), o4, i3), new t2.ErrnoError(63);
      }, readlink(n3) {
        throw s4?.("readlink", a2.realPath(n3)), new t2.ErrnoError(63);
      } }, stream_ops: { open(n3) {
        s4?.("open stream", a2.realPath(n3.node));
        let o4 = a2.realPath(n3.node);
        return a2.tryFSOperation(() => {
          t2.isFile(n3.node.mode) && (n3.shared.refcount = 1, n3.nfd = e.open(o4));
        });
      }, close(n3) {
        return s4?.("close stream", a2.realPath(n3.node)), a2.tryFSOperation(() => {
          t2.isFile(n3.node.mode) && n3.nfd && --n3.shared.refcount === 0 && e.close(n3.nfd);
        });
      }, dup(n3) {
        s4?.("dup stream", a2.realPath(n3.node)), n3.shared.refcount++;
      }, read(n3, o4, i3, u2, c2) {
        return s4?.("read stream", a2.realPath(n3.node), i3, u2, c2), u2 === 0 ? 0 : a2.tryFSOperation(() => e.read(n3.nfd, o4, i3, u2, c2));
      }, write(n3, o4, i3, u2, c2) {
        return s4?.("write stream", a2.realPath(n3.node), i3, u2, c2), a2.tryFSOperation(() => e.write(n3.nfd, o4.buffer, i3, u2, c2));
      }, llseek(n3, o4, i3) {
        s4?.("llseek stream", a2.realPath(n3.node), o4, i3);
        let u2 = o4;
        if (i3 === 1 ? u2 += n3.position : i3 === 2 && t2.isFile(n3.node.mode) && a2.tryFSOperation(() => {
          let c2 = e.fstat(n3.nfd);
          u2 += c2.size;
        }), u2 < 0) throw new t2.ErrnoError(28);
        return u2;
      }, mmap(n3, o4, i3, u2, c2) {
        if (s4?.("mmap stream", a2.realPath(n3.node), o4, i3, u2, c2), !t2.isFile(n3.node.mode)) throw new t2.ErrnoError(pr.ENODEV);
        let m4 = r.mmapAlloc(o4);
        return a2.stream_ops.read(n3, r.HEAP8, m4, o4, i3), { ptr: m4, allocated: true };
      }, msync(n3, o4, i3, u2, c2) {
        return s4?.("msync stream", a2.realPath(n3.node), i3, u2, c2), a2.stream_ops.write(n3, o4, 0, u2, i3), 0;
      } } };
      return a2;
    };
  }
});

// (disabled):fs
var require_fs = __commonJS({
  "(disabled):fs"() {
  }
});

// (disabled):stream
var require_stream = __commonJS({
  "(disabled):stream"() {
  }
});

// (disabled):stream/promises
var require_promises2 = __commonJS({
  "(disabled):stream/promises"() {
  }
});

// (disabled):path
var require_path = __commonJS({
  "(disabled):path"() {
  }
});

// node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/fs/nodefs.js
var nodefs_exports = {};
__export(nodefs_exports, {
  NodeFS: () => m2
});
var s3, o3, m2;
var init_nodefs = __esm({
  "node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/fs/nodefs.js"() {
    init_chunk_VBDAOXYI();
    init_chunk_QY3QWFKW();
    s3 = __toESM(require_fs(), 1);
    o3 = __toESM(require_path(), 1);
    u();
    m2 = class extends ur {
      constructor(t2) {
        super(t2), this.rootDir = (void 0)(t2), (void 0)((void 0)(this.rootDir)) || (void 0)(this.rootDir);
      }
      async init(t2, e) {
        return this.pg = t2, { emscriptenOpts: { ...e, preRun: [...e.preRun || [], (r) => {
          let c2 = r.FS.filesystems.NODEFS;
          r.FS.mkdir(C2), r.FS.mount(c2, { root: this.rootDir }, C2);
        }] } };
      }
      async closeFs() {
        this.pg.Module.FS.quit();
      }
    };
  }
});

// node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/fs/opfs-ahp.js
var opfs_ahp_exports = {};
__export(opfs_ahp_exports, {
  OpfsAhpFS: () => L4
});
var $2, G2, T4, H3, v2, F3, M, y3, b2, m3, x5, P3, D3, S2, n2, C3, O3, k3, w3, f2, I, W2, j2, L4, p3;
var init_opfs_ahp = __esm({
  "node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/fs/opfs-ahp.js"() {
    init_chunk_VBDAOXYI();
    init_chunk_QY3QWFKW();
    u();
    $2 = "state.txt";
    G2 = "data";
    T4 = { DIR: 16384, FILE: 32768 };
    L4 = class extends cr {
      constructor(e, { initialPoolSize: t2 = 1e3, maintainedPoolSize: o4 = 100, debug: i3 = false } = {}) {
        super(e, { debug: i3 });
        R(this, n2);
        R(this, H3);
        R(this, v2);
        R(this, F3);
        R(this, M);
        R(this, y3);
        R(this, b2, /* @__PURE__ */ new Map());
        R(this, m3, /* @__PURE__ */ new Map());
        R(this, x5, 0);
        R(this, P3, /* @__PURE__ */ new Map());
        R(this, D3, /* @__PURE__ */ new Map());
        this.lastCheckpoint = 0;
        this.checkpointInterval = 1e3 * 60;
        this.poolCounter = 0;
        R(this, S2, /* @__PURE__ */ new Set());
        this.initialPoolSize = t2, this.maintainedPoolSize = o4;
      }
      async init(e, t2) {
        return await T(this, n2, C3).call(this), super.init(e, t2);
      }
      async syncToFs(e = false) {
        await this.maybeCheckpointState(), await this.maintainPool(), e || this.flush();
      }
      async closeFs() {
        for (let e of h(this, m3).values()) e.close();
        h(this, y3).flush(), h(this, y3).close(), this.pg.Module.FS.quit();
      }
      async maintainPool(e) {
        e = e || this.maintainedPoolSize;
        let t2 = e - this.state.pool.length, o4 = [];
        for (let i3 = 0; i3 < t2; i3++) o4.push(new Promise(async (c2) => {
          ++this.poolCounter;
          let a2 = `${(Date.now() - 1704063600).toString(16).padStart(8, "0")}-${this.poolCounter.toString(16).padStart(8, "0")}`, h3 = await h(this, F3).getFileHandle(a2, { create: true }), d2 = await h3.createSyncAccessHandle();
          h(this, b2).set(a2, h3), h(this, m3).set(a2, d2), T(this, n2, k3).call(this, { opp: "createPoolFile", args: [a2] }), this.state.pool.push(a2), c2();
        }));
        for (let i3 = 0; i3 > t2; i3--) o4.push(new Promise(async (c2) => {
          let a2 = this.state.pool.pop();
          T(this, n2, k3).call(this, { opp: "deletePoolFile", args: [a2] });
          let h3 = h(this, b2).get(a2);
          h(this, m3).get(a2)?.close(), await h(this, F3).removeEntry(h3.name), h(this, b2).delete(a2), h(this, m3).delete(a2), c2();
        }));
        await Promise.all(o4);
      }
      _createPoolFileState(e) {
        this.state.pool.push(e);
      }
      _deletePoolFileState(e) {
        let t2 = this.state.pool.indexOf(e);
        t2 > -1 && this.state.pool.splice(t2, 1);
      }
      async maybeCheckpointState() {
        Date.now() - this.lastCheckpoint > this.checkpointInterval && await this.checkpointState();
      }
      async checkpointState() {
        let e = new TextEncoder().encode(JSON.stringify(this.state));
        h(this, y3).truncate(0), h(this, y3).write(e, { at: 0 }), h(this, y3).flush(), this.lastCheckpoint = Date.now();
      }
      flush() {
        for (let e of h(this, S2)) try {
          e.flush();
        } catch {
        }
        h(this, S2).clear();
      }
      chmod(e, t2) {
        T(this, n2, O3).call(this, { opp: "chmod", args: [e, t2] }, () => {
          this._chmodState(e, t2);
        });
      }
      _chmodState(e, t2) {
        let o4 = T(this, n2, f2).call(this, e);
        o4.mode = t2;
      }
      close(e) {
        let t2 = T(this, n2, I).call(this, e);
        h(this, P3).delete(e), h(this, D3).delete(t2);
      }
      fstat(e) {
        let t2 = T(this, n2, I).call(this, e);
        return this.lstat(t2);
      }
      lstat(e) {
        let t2 = T(this, n2, f2).call(this, e), o4 = t2.type === "file" ? h(this, m3).get(t2.backingFilename).getSize() : 0, i3 = 4096;
        return { dev: 0, ino: 0, mode: t2.mode, nlink: 1, uid: 0, gid: 0, rdev: 0, size: o4, blksize: i3, blocks: Math.ceil(o4 / i3), atime: t2.lastModified, mtime: t2.lastModified, ctime: t2.lastModified };
      }
      mkdir(e, t2) {
        T(this, n2, O3).call(this, { opp: "mkdir", args: [e, t2] }, () => {
          this._mkdirState(e, t2);
        });
      }
      _mkdirState(e, t2) {
        let o4 = T(this, n2, w3).call(this, e), i3 = o4.pop(), c2 = [], a2 = this.state.root;
        for (let d2 of o4) {
          if (c2.push(e), !Object.prototype.hasOwnProperty.call(a2.children, d2)) if (t2?.recursive) this.mkdir(c2.join("/"));
          else throw new p3("ENOENT", "No such file or directory");
          if (a2.children[d2].type !== "directory") throw new p3("ENOTDIR", "Not a directory");
          a2 = a2.children[d2];
        }
        if (Object.prototype.hasOwnProperty.call(a2.children, i3)) throw new p3("EEXIST", "File exists");
        let h3 = { type: "directory", lastModified: Date.now(), mode: t2?.mode || T4.DIR, children: {} };
        a2.children[i3] = h3;
      }
      open(e, t2, o4) {
        if (T(this, n2, f2).call(this, e).type !== "file") throw new p3("EISDIR", "Is a directory");
        let c2 = T(this, n2, W2).call(this);
        return h(this, P3).set(c2, e), h(this, D3).set(e, c2), c2;
      }
      readdir(e) {
        let t2 = T(this, n2, f2).call(this, e);
        if (t2.type !== "directory") throw new p3("ENOTDIR", "Not a directory");
        return Object.keys(t2.children);
      }
      read(e, t2, o4, i3, c2) {
        let a2 = T(this, n2, I).call(this, e), h3 = T(this, n2, f2).call(this, a2);
        if (h3.type !== "file") throw new p3("EISDIR", "Is a directory");
        return h(this, m3).get(h3.backingFilename).read(new Uint8Array(t2.buffer, o4, i3), { at: c2 });
      }
      rename(e, t2) {
        T(this, n2, O3).call(this, { opp: "rename", args: [e, t2] }, () => {
          this._renameState(e, t2, true);
        });
      }
      _renameState(e, t2, o4 = false) {
        let i3 = T(this, n2, w3).call(this, e), c2 = i3.pop(), a2 = T(this, n2, f2).call(this, i3.join("/"));
        if (!Object.prototype.hasOwnProperty.call(a2.children, c2)) throw new p3("ENOENT", "No such file or directory");
        let h3 = T(this, n2, w3).call(this, t2), d2 = h3.pop(), l3 = T(this, n2, f2).call(this, h3.join("/"));
        if (o4 && Object.prototype.hasOwnProperty.call(l3.children, d2)) {
          let u2 = l3.children[d2];
          h(this, m3).get(u2.backingFilename).truncate(0), this.state.pool.push(u2.backingFilename);
        }
        l3.children[d2] = a2.children[c2], delete a2.children[c2];
      }
      rmdir(e) {
        T(this, n2, O3).call(this, { opp: "rmdir", args: [e] }, () => {
          this._rmdirState(e);
        });
      }
      _rmdirState(e) {
        let t2 = T(this, n2, w3).call(this, e), o4 = t2.pop(), i3 = T(this, n2, f2).call(this, t2.join("/"));
        if (!Object.prototype.hasOwnProperty.call(i3.children, o4)) throw new p3("ENOENT", "No such file or directory");
        let c2 = i3.children[o4];
        if (c2.type !== "directory") throw new p3("ENOTDIR", "Not a directory");
        if (Object.keys(c2.children).length > 0) throw new p3("ENOTEMPTY", "Directory not empty");
        delete i3.children[o4];
      }
      truncate(e, t2 = 0) {
        let o4 = T(this, n2, f2).call(this, e);
        if (o4.type !== "file") throw new p3("EISDIR", "Is a directory");
        let i3 = h(this, m3).get(o4.backingFilename);
        if (!i3) throw new p3("ENOENT", "No such file or directory");
        i3.truncate(t2), h(this, S2).add(i3);
      }
      unlink(e) {
        T(this, n2, O3).call(this, { opp: "unlink", args: [e] }, () => {
          this._unlinkState(e, true);
        });
      }
      _unlinkState(e, t2 = false) {
        let o4 = T(this, n2, w3).call(this, e), i3 = o4.pop(), c2 = T(this, n2, f2).call(this, o4.join("/"));
        if (!Object.prototype.hasOwnProperty.call(c2.children, i3)) throw new p3("ENOENT", "No such file or directory");
        let a2 = c2.children[i3];
        if (a2.type !== "file") throw new p3("EISDIR", "Is a directory");
        if (delete c2.children[i3], t2) {
          let h3 = h(this, m3).get(a2.backingFilename);
          h3?.truncate(0), h(this, S2).add(h3), h(this, D3).has(e) && (h(this, P3).delete(h(this, D3).get(e)), h(this, D3).delete(e));
        }
        this.state.pool.push(a2.backingFilename);
      }
      utimes(e, t2, o4) {
        T(this, n2, O3).call(this, { opp: "utimes", args: [e, t2, o4] }, () => {
          this._utimesState(e, t2, o4);
        });
      }
      _utimesState(e, t2, o4) {
        let i3 = T(this, n2, f2).call(this, e);
        i3.lastModified = o4;
      }
      writeFile(e, t2, o4) {
        let i3 = T(this, n2, w3).call(this, e), c2 = i3.pop(), a2 = T(this, n2, f2).call(this, i3.join("/"));
        if (Object.prototype.hasOwnProperty.call(a2.children, c2)) {
          let l3 = a2.children[c2];
          l3.lastModified = Date.now(), T(this, n2, k3).call(this, { opp: "setLastModified", args: [e, l3.lastModified] });
        } else {
          if (this.state.pool.length === 0) throw new Error("No more file handles available in the pool");
          let l3 = { type: "file", lastModified: Date.now(), mode: o4?.mode || T4.FILE, backingFilename: this.state.pool.pop() };
          a2.children[c2] = l3, T(this, n2, k3).call(this, { opp: "createFileNode", args: [e, l3] });
        }
        let h3 = a2.children[c2], d2 = h(this, m3).get(h3.backingFilename);
        t2.length > 0 && (d2.write(typeof t2 == "string" ? new TextEncoder().encode(t2) : new Uint8Array(t2), { at: 0 }), e.startsWith("/pg_wal") && h(this, S2).add(d2));
      }
      _createFileNodeState(e, t2) {
        let o4 = T(this, n2, w3).call(this, e), i3 = o4.pop(), c2 = T(this, n2, f2).call(this, o4.join("/"));
        c2.children[i3] = t2;
        let a2 = this.state.pool.indexOf(t2.backingFilename);
        return a2 > -1 && this.state.pool.splice(a2, 1), t2;
      }
      _setLastModifiedState(e, t2) {
        let o4 = T(this, n2, f2).call(this, e);
        o4.lastModified = t2;
      }
      write(e, t2, o4, i3, c2) {
        let a2 = T(this, n2, I).call(this, e), h3 = T(this, n2, f2).call(this, a2);
        if (h3.type !== "file") throw new p3("EISDIR", "Is a directory");
        let d2 = h(this, m3).get(h3.backingFilename);
        if (!d2) throw new p3("EBADF", "Bad file descriptor");
        let l3 = d2.write(new Uint8Array(t2, o4, i3), { at: c2 });
        return a2.startsWith("/pg_wal") && h(this, S2).add(d2), l3;
      }
    };
    H3 = /* @__PURE__ */ new WeakMap(), v2 = /* @__PURE__ */ new WeakMap(), F3 = /* @__PURE__ */ new WeakMap(), M = /* @__PURE__ */ new WeakMap(), y3 = /* @__PURE__ */ new WeakMap(), b2 = /* @__PURE__ */ new WeakMap(), m3 = /* @__PURE__ */ new WeakMap(), x5 = /* @__PURE__ */ new WeakMap(), P3 = /* @__PURE__ */ new WeakMap(), D3 = /* @__PURE__ */ new WeakMap(), S2 = /* @__PURE__ */ new WeakMap(), n2 = /* @__PURE__ */ new WeakSet(), C3 = async function() {
      x(this, H3, await navigator.storage.getDirectory()), x(this, v2, await T(this, n2, j2).call(this, this.dataDir, { create: true })), x(this, F3, await T(this, n2, j2).call(this, G2, { from: h(this, v2), create: true })), x(this, M, await h(this, v2).getFileHandle($2, { create: true })), x(this, y3, await h(this, M).createSyncAccessHandle());
      let e = new ArrayBuffer(h(this, y3).getSize());
      h(this, y3).read(e, { at: 0 });
      let t2, o4 = new TextDecoder().decode(e).split(`
`), i3 = false;
      try {
        t2 = JSON.parse(o4[0]);
      } catch {
        t2 = { root: { type: "directory", lastModified: Date.now(), mode: T4.DIR, children: {} }, pool: [] }, h(this, y3).truncate(0), h(this, y3).write(new TextEncoder().encode(JSON.stringify(t2)), { at: 0 }), i3 = true;
      }
      this.state = t2;
      let c2 = o4.slice(1).filter(Boolean).map((l3) => JSON.parse(l3));
      for (let l3 of c2) {
        let u2 = `_${l3.opp}State`;
        if (typeof this[u2] == "function") try {
          this[u2].bind(this)(...l3.args);
        } catch (N2) {
          console.warn("Error applying OPFS AHP WAL entry", l3, N2);
        }
      }
      let a2 = [], h3 = async (l3) => {
        if (l3.type === "file") try {
          let u2 = await h(this, F3).getFileHandle(l3.backingFilename), N2 = await u2.createSyncAccessHandle();
          h(this, b2).set(l3.backingFilename, u2), h(this, m3).set(l3.backingFilename, N2);
        } catch (u2) {
          console.error("Error opening file handle for node", l3, u2);
        }
        else for (let u2 of Object.values(l3.children)) a2.push(h3(u2));
      };
      await h3(this.state.root);
      let d2 = [];
      for (let l3 of this.state.pool) d2.push(new Promise(async (u2) => {
        h(this, b2).has(l3) && console.warn("File handle already exists for pool file", l3);
        let N2 = await h(this, F3).getFileHandle(l3), U3 = await N2.createSyncAccessHandle();
        h(this, b2).set(l3, N2), h(this, m3).set(l3, U3), u2();
      }));
      await Promise.all([...a2, ...d2]), await this.maintainPool(i3 ? this.initialPoolSize : this.maintainedPoolSize);
    }, O3 = function(e, t2) {
      let o4 = T(this, n2, k3).call(this, e);
      try {
        t2();
      } catch (i3) {
        throw h(this, y3).truncate(o4), i3;
      }
    }, k3 = function(e) {
      let t2 = JSON.stringify(e), o4 = new TextEncoder().encode(`
${t2}`), i3 = h(this, y3).getSize();
      return h(this, y3).write(o4, { at: i3 }), h(this, S2).add(h(this, y3)), i3;
    }, w3 = function(e) {
      return e.split("/").filter(Boolean);
    }, f2 = function(e, t2) {
      let o4 = T(this, n2, w3).call(this, e), i3 = t2 || this.state.root;
      for (let c2 of o4) {
        if (i3.type !== "directory") throw new p3("ENOTDIR", "Not a directory");
        if (!Object.prototype.hasOwnProperty.call(i3.children, c2)) throw new p3("ENOENT", "No such file or directory");
        i3 = i3.children[c2];
      }
      return i3;
    }, I = function(e) {
      let t2 = h(this, P3).get(e);
      if (!t2) throw new p3("EBADF", "Bad file descriptor");
      return t2;
    }, W2 = function() {
      let e = ++U(this, x5)._;
      for (; h(this, P3).has(e); ) U(this, x5)._++;
      return e;
    }, j2 = async function(e, t2) {
      let o4 = T(this, n2, w3).call(this, e), i3 = t2?.from || h(this, H3);
      for (let c2 of o4) i3 = await i3.getDirectoryHandle(c2, { create: t2?.create });
      return i3;
    };
    p3 = class extends Error {
      constructor(A2, e) {
        super(e), typeof A2 == "number" ? this.code = A2 : typeof A2 == "string" && (this.code = pr[A2]);
      }
    };
  }
});

// (disabled):module
var require_module = __commonJS({
  "(disabled):module"() {
  }
});

// node_modules/.pnpm/reflect-metadata@0.2.2/node_modules/reflect-metadata/Reflect.js
var require_Reflect = __commonJS({
  "node_modules/.pnpm/reflect-metadata@0.2.2/node_modules/reflect-metadata/Reflect.js"() {
    var Reflect2;
    (function(Reflect3) {
      (function(factory) {
        var root = typeof globalThis === "object" ? globalThis : typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : sloppyModeThis();
        var exporter = makeExporter(Reflect3);
        if (typeof root.Reflect !== "undefined") {
          exporter = makeExporter(root.Reflect, exporter);
        }
        factory(exporter, root);
        if (typeof root.Reflect === "undefined") {
          root.Reflect = Reflect3;
        }
        function makeExporter(target, previous) {
          return function(key, value) {
            Object.defineProperty(target, key, { configurable: true, writable: true, value });
            if (previous)
              previous(key, value);
          };
        }
        function functionThis() {
          try {
            return Function("return this;")();
          } catch (_3) {
          }
        }
        function indirectEvalThis() {
          try {
            return (void 0, eval)("(function() { return this; })()");
          } catch (_3) {
          }
        }
        function sloppyModeThis() {
          return functionThis() || indirectEvalThis();
        }
      })(function(exporter, root) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var supportsSymbol = typeof Symbol === "function";
        var toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : "@@toPrimitive";
        var iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : "@@iterator";
        var supportsCreate = typeof Object.create === "function";
        var supportsProto = { __proto__: [] } instanceof Array;
        var downLevel = !supportsCreate && !supportsProto;
        var HashMap = {
          // create an object in dictionary mode (a.k.a. "slow" mode in v8)
          create: supportsCreate ? function() {
            return MakeDictionary(/* @__PURE__ */ Object.create(null));
          } : supportsProto ? function() {
            return MakeDictionary({ __proto__: null });
          } : function() {
            return MakeDictionary({});
          },
          has: downLevel ? function(map, key) {
            return hasOwn.call(map, key);
          } : function(map, key) {
            return key in map;
          },
          get: downLevel ? function(map, key) {
            return hasOwn.call(map, key) ? map[key] : void 0;
          } : function(map, key) {
            return map[key];
          }
        };
        var functionPrototype = Object.getPrototypeOf(Function);
        var _Map = typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : CreateMapPolyfill();
        var _Set = typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : CreateSetPolyfill();
        var _WeakMap = typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();
        var registrySymbol = supportsSymbol ? /* @__PURE__ */ Symbol.for("@reflect-metadata:registry") : void 0;
        var metadataRegistry = GetOrCreateMetadataRegistry();
        var metadataProvider = CreateMetadataProvider(metadataRegistry);
        function decorate(decorators, target, propertyKey, attributes) {
          if (!IsUndefined(propertyKey)) {
            if (!IsArray(decorators))
              throw new TypeError();
            if (!IsObject(target))
              throw new TypeError();
            if (!IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes))
              throw new TypeError();
            if (IsNull(attributes))
              attributes = void 0;
            propertyKey = ToPropertyKey(propertyKey);
            return DecorateProperty(decorators, target, propertyKey, attributes);
          } else {
            if (!IsArray(decorators))
              throw new TypeError();
            if (!IsConstructor(target))
              throw new TypeError();
            return DecorateConstructor(decorators, target);
          }
        }
        exporter("decorate", decorate);
        function metadata2(metadataKey, metadataValue) {
          function decorator(target, propertyKey) {
            if (!IsObject(target))
              throw new TypeError();
            if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
              throw new TypeError();
            OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
          }
          return decorator;
        }
        exporter("metadata", metadata2);
        function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
        }
        exporter("defineMetadata", defineMetadata);
        function hasMetadata(metadataKey, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryHasMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasMetadata", hasMetadata);
        function hasOwnMetadata(metadataKey, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasOwnMetadata", hasOwnMetadata);
        function getMetadata(metadataKey, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryGetMetadata(metadataKey, target, propertyKey);
        }
        exporter("getMetadata", getMetadata);
        function getOwnMetadata(metadataKey, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("getOwnMetadata", getOwnMetadata);
        function getMetadataKeys(target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryMetadataKeys(target, propertyKey);
        }
        exporter("getMetadataKeys", getMetadataKeys);
        function getOwnMetadataKeys(target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryOwnMetadataKeys(target, propertyKey);
        }
        exporter("getOwnMetadataKeys", getOwnMetadataKeys);
        function deleteMetadata(metadataKey, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          var provider = GetMetadataProvider(
            target,
            propertyKey,
            /*Create*/
            false
          );
          if (IsUndefined(provider))
            return false;
          return provider.OrdinaryDeleteMetadata(metadataKey, target, propertyKey);
        }
        exporter("deleteMetadata", deleteMetadata);
        function DecorateConstructor(decorators, target) {
          for (var i3 = decorators.length - 1; i3 >= 0; --i3) {
            var decorator = decorators[i3];
            var decorated = decorator(target);
            if (!IsUndefined(decorated) && !IsNull(decorated)) {
              if (!IsConstructor(decorated))
                throw new TypeError();
              target = decorated;
            }
          }
          return target;
        }
        function DecorateProperty(decorators, target, propertyKey, descriptor) {
          for (var i3 = decorators.length - 1; i3 >= 0; --i3) {
            var decorator = decorators[i3];
            var decorated = decorator(target, propertyKey, descriptor);
            if (!IsUndefined(decorated) && !IsNull(decorated)) {
              if (!IsObject(decorated))
                throw new TypeError();
              descriptor = decorated;
            }
          }
          return descriptor;
        }
        function OrdinaryHasMetadata(MetadataKey, O5, P4) {
          var hasOwn2 = OrdinaryHasOwnMetadata(MetadataKey, O5, P4);
          if (hasOwn2)
            return true;
          var parent = OrdinaryGetPrototypeOf(O5);
          if (!IsNull(parent))
            return OrdinaryHasMetadata(MetadataKey, parent, P4);
          return false;
        }
        function OrdinaryHasOwnMetadata(MetadataKey, O5, P4) {
          var provider = GetMetadataProvider(
            O5,
            P4,
            /*Create*/
            false
          );
          if (IsUndefined(provider))
            return false;
          return ToBoolean(provider.OrdinaryHasOwnMetadata(MetadataKey, O5, P4));
        }
        function OrdinaryGetMetadata(MetadataKey, O5, P4) {
          var hasOwn2 = OrdinaryHasOwnMetadata(MetadataKey, O5, P4);
          if (hasOwn2)
            return OrdinaryGetOwnMetadata(MetadataKey, O5, P4);
          var parent = OrdinaryGetPrototypeOf(O5);
          if (!IsNull(parent))
            return OrdinaryGetMetadata(MetadataKey, parent, P4);
          return void 0;
        }
        function OrdinaryGetOwnMetadata(MetadataKey, O5, P4) {
          var provider = GetMetadataProvider(
            O5,
            P4,
            /*Create*/
            false
          );
          if (IsUndefined(provider))
            return;
          return provider.OrdinaryGetOwnMetadata(MetadataKey, O5, P4);
        }
        function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O5, P4) {
          var provider = GetMetadataProvider(
            O5,
            P4,
            /*Create*/
            true
          );
          provider.OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O5, P4);
        }
        function OrdinaryMetadataKeys(O5, P4) {
          var ownKeys = OrdinaryOwnMetadataKeys(O5, P4);
          var parent = OrdinaryGetPrototypeOf(O5);
          if (parent === null)
            return ownKeys;
          var parentKeys = OrdinaryMetadataKeys(parent, P4);
          if (parentKeys.length <= 0)
            return ownKeys;
          if (ownKeys.length <= 0)
            return parentKeys;
          var set = new _Set();
          var keys = [];
          for (var _i = 0, ownKeys_1 = ownKeys; _i < ownKeys_1.length; _i++) {
            var key = ownKeys_1[_i];
            var hasKey = set.has(key);
            if (!hasKey) {
              set.add(key);
              keys.push(key);
            }
          }
          for (var _a = 0, parentKeys_1 = parentKeys; _a < parentKeys_1.length; _a++) {
            var key = parentKeys_1[_a];
            var hasKey = set.has(key);
            if (!hasKey) {
              set.add(key);
              keys.push(key);
            }
          }
          return keys;
        }
        function OrdinaryOwnMetadataKeys(O5, P4) {
          var provider = GetMetadataProvider(
            O5,
            P4,
            /*create*/
            false
          );
          if (!provider) {
            return [];
          }
          return provider.OrdinaryOwnMetadataKeys(O5, P4);
        }
        function Type2(x6) {
          if (x6 === null)
            return 1;
          switch (typeof x6) {
            case "undefined":
              return 0;
            case "boolean":
              return 2;
            case "string":
              return 3;
            case "symbol":
              return 4;
            case "number":
              return 5;
            case "object":
              return x6 === null ? 1 : 6;
            default:
              return 6;
          }
        }
        function IsUndefined(x6) {
          return x6 === void 0;
        }
        function IsNull(x6) {
          return x6 === null;
        }
        function IsSymbol(x6) {
          return typeof x6 === "symbol";
        }
        function IsObject(x6) {
          return typeof x6 === "object" ? x6 !== null : typeof x6 === "function";
        }
        function ToPrimitive(input, PreferredType) {
          switch (Type2(input)) {
            case 0:
              return input;
            case 1:
              return input;
            case 2:
              return input;
            case 3:
              return input;
            case 4:
              return input;
            case 5:
              return input;
          }
          var hint = PreferredType === 3 ? "string" : PreferredType === 5 ? "number" : "default";
          var exoticToPrim = GetMethod(input, toPrimitiveSymbol);
          if (exoticToPrim !== void 0) {
            var result = exoticToPrim.call(input, hint);
            if (IsObject(result))
              throw new TypeError();
            return result;
          }
          return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
        }
        function OrdinaryToPrimitive(O5, hint) {
          if (hint === "string") {
            var toString_1 = O5.toString;
            if (IsCallable(toString_1)) {
              var result = toString_1.call(O5);
              if (!IsObject(result))
                return result;
            }
            var valueOf = O5.valueOf;
            if (IsCallable(valueOf)) {
              var result = valueOf.call(O5);
              if (!IsObject(result))
                return result;
            }
          } else {
            var valueOf = O5.valueOf;
            if (IsCallable(valueOf)) {
              var result = valueOf.call(O5);
              if (!IsObject(result))
                return result;
            }
            var toString_2 = O5.toString;
            if (IsCallable(toString_2)) {
              var result = toString_2.call(O5);
              if (!IsObject(result))
                return result;
            }
          }
          throw new TypeError();
        }
        function ToBoolean(argument) {
          return !!argument;
        }
        function ToString(argument) {
          return "" + argument;
        }
        function ToPropertyKey(argument) {
          var key = ToPrimitive(
            argument,
            3
            /* String */
          );
          if (IsSymbol(key))
            return key;
          return ToString(key);
        }
        function IsArray(argument) {
          return Array.isArray ? Array.isArray(argument) : argument instanceof Object ? argument instanceof Array : Object.prototype.toString.call(argument) === "[object Array]";
        }
        function IsCallable(argument) {
          return typeof argument === "function";
        }
        function IsConstructor(argument) {
          return typeof argument === "function";
        }
        function IsPropertyKey(argument) {
          switch (Type2(argument)) {
            case 3:
              return true;
            case 4:
              return true;
            default:
              return false;
          }
        }
        function SameValueZero(x6, y4) {
          return x6 === y4 || x6 !== x6 && y4 !== y4;
        }
        function GetMethod(V2, P4) {
          var func2 = V2[P4];
          if (func2 === void 0 || func2 === null)
            return void 0;
          if (!IsCallable(func2))
            throw new TypeError();
          return func2;
        }
        function GetIterator(obj) {
          var method = GetMethod(obj, iteratorSymbol);
          if (!IsCallable(method))
            throw new TypeError();
          var iterator = method.call(obj);
          if (!IsObject(iterator))
            throw new TypeError();
          return iterator;
        }
        function IteratorValue(iterResult) {
          return iterResult.value;
        }
        function IteratorStep(iterator) {
          var result = iterator.next();
          return result.done ? false : result;
        }
        function IteratorClose(iterator) {
          var f3 = iterator["return"];
          if (f3)
            f3.call(iterator);
        }
        function OrdinaryGetPrototypeOf(O5) {
          var proto = Object.getPrototypeOf(O5);
          if (typeof O5 !== "function" || O5 === functionPrototype)
            return proto;
          if (proto !== functionPrototype)
            return proto;
          var prototype = O5.prototype;
          var prototypeProto = prototype && Object.getPrototypeOf(prototype);
          if (prototypeProto == null || prototypeProto === Object.prototype)
            return proto;
          var constructor = prototypeProto.constructor;
          if (typeof constructor !== "function")
            return proto;
          if (constructor === O5)
            return proto;
          return constructor;
        }
        function CreateMetadataRegistry() {
          var fallback;
          if (!IsUndefined(registrySymbol) && typeof root.Reflect !== "undefined" && !(registrySymbol in root.Reflect) && typeof root.Reflect.defineMetadata === "function") {
            fallback = CreateFallbackProvider(root.Reflect);
          }
          var first;
          var second;
          var rest;
          var targetProviderMap = new _WeakMap();
          var registry = {
            registerProvider,
            getProvider,
            setProvider
          };
          return registry;
          function registerProvider(provider) {
            if (!Object.isExtensible(registry)) {
              throw new Error("Cannot add provider to a frozen registry.");
            }
            switch (true) {
              case fallback === provider:
                break;
              case IsUndefined(first):
                first = provider;
                break;
              case first === provider:
                break;
              case IsUndefined(second):
                second = provider;
                break;
              case second === provider:
                break;
              default:
                if (rest === void 0)
                  rest = new _Set();
                rest.add(provider);
                break;
            }
          }
          function getProviderNoCache(O5, P4) {
            if (!IsUndefined(first)) {
              if (first.isProviderFor(O5, P4))
                return first;
              if (!IsUndefined(second)) {
                if (second.isProviderFor(O5, P4))
                  return first;
                if (!IsUndefined(rest)) {
                  var iterator = GetIterator(rest);
                  while (true) {
                    var next = IteratorStep(iterator);
                    if (!next) {
                      return void 0;
                    }
                    var provider = IteratorValue(next);
                    if (provider.isProviderFor(O5, P4)) {
                      IteratorClose(iterator);
                      return provider;
                    }
                  }
                }
              }
            }
            if (!IsUndefined(fallback) && fallback.isProviderFor(O5, P4)) {
              return fallback;
            }
            return void 0;
          }
          function getProvider(O5, P4) {
            var providerMap = targetProviderMap.get(O5);
            var provider;
            if (!IsUndefined(providerMap)) {
              provider = providerMap.get(P4);
            }
            if (!IsUndefined(provider)) {
              return provider;
            }
            provider = getProviderNoCache(O5, P4);
            if (!IsUndefined(provider)) {
              if (IsUndefined(providerMap)) {
                providerMap = new _Map();
                targetProviderMap.set(O5, providerMap);
              }
              providerMap.set(P4, provider);
            }
            return provider;
          }
          function hasProvider(provider) {
            if (IsUndefined(provider))
              throw new TypeError();
            return first === provider || second === provider || !IsUndefined(rest) && rest.has(provider);
          }
          function setProvider(O5, P4, provider) {
            if (!hasProvider(provider)) {
              throw new Error("Metadata provider not registered.");
            }
            var existingProvider = getProvider(O5, P4);
            if (existingProvider !== provider) {
              if (!IsUndefined(existingProvider)) {
                return false;
              }
              var providerMap = targetProviderMap.get(O5);
              if (IsUndefined(providerMap)) {
                providerMap = new _Map();
                targetProviderMap.set(O5, providerMap);
              }
              providerMap.set(P4, provider);
            }
            return true;
          }
        }
        function GetOrCreateMetadataRegistry() {
          var metadataRegistry2;
          if (!IsUndefined(registrySymbol) && IsObject(root.Reflect) && Object.isExtensible(root.Reflect)) {
            metadataRegistry2 = root.Reflect[registrySymbol];
          }
          if (IsUndefined(metadataRegistry2)) {
            metadataRegistry2 = CreateMetadataRegistry();
          }
          if (!IsUndefined(registrySymbol) && IsObject(root.Reflect) && Object.isExtensible(root.Reflect)) {
            Object.defineProperty(root.Reflect, registrySymbol, {
              enumerable: false,
              configurable: false,
              writable: false,
              value: metadataRegistry2
            });
          }
          return metadataRegistry2;
        }
        function CreateMetadataProvider(registry) {
          var metadata3 = new _WeakMap();
          var provider = {
            isProviderFor: function(O5, P4) {
              var targetMetadata = metadata3.get(O5);
              if (IsUndefined(targetMetadata))
                return false;
              return targetMetadata.has(P4);
            },
            OrdinaryDefineOwnMetadata: OrdinaryDefineOwnMetadata2,
            OrdinaryHasOwnMetadata: OrdinaryHasOwnMetadata2,
            OrdinaryGetOwnMetadata: OrdinaryGetOwnMetadata2,
            OrdinaryOwnMetadataKeys: OrdinaryOwnMetadataKeys2,
            OrdinaryDeleteMetadata
          };
          metadataRegistry.registerProvider(provider);
          return provider;
          function GetOrCreateMetadataMap(O5, P4, Create) {
            var targetMetadata = metadata3.get(O5);
            var createdTargetMetadata = false;
            if (IsUndefined(targetMetadata)) {
              if (!Create)
                return void 0;
              targetMetadata = new _Map();
              metadata3.set(O5, targetMetadata);
              createdTargetMetadata = true;
            }
            var metadataMap = targetMetadata.get(P4);
            if (IsUndefined(metadataMap)) {
              if (!Create)
                return void 0;
              metadataMap = new _Map();
              targetMetadata.set(P4, metadataMap);
              if (!registry.setProvider(O5, P4, provider)) {
                targetMetadata.delete(P4);
                if (createdTargetMetadata) {
                  metadata3.delete(O5);
                }
                throw new Error("Wrong provider for target.");
              }
            }
            return metadataMap;
          }
          function OrdinaryHasOwnMetadata2(MetadataKey, O5, P4) {
            var metadataMap = GetOrCreateMetadataMap(
              O5,
              P4,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return false;
            return ToBoolean(metadataMap.has(MetadataKey));
          }
          function OrdinaryGetOwnMetadata2(MetadataKey, O5, P4) {
            var metadataMap = GetOrCreateMetadataMap(
              O5,
              P4,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return void 0;
            return metadataMap.get(MetadataKey);
          }
          function OrdinaryDefineOwnMetadata2(MetadataKey, MetadataValue, O5, P4) {
            var metadataMap = GetOrCreateMetadataMap(
              O5,
              P4,
              /*Create*/
              true
            );
            metadataMap.set(MetadataKey, MetadataValue);
          }
          function OrdinaryOwnMetadataKeys2(O5, P4) {
            var keys = [];
            var metadataMap = GetOrCreateMetadataMap(
              O5,
              P4,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return keys;
            var keysObj = metadataMap.keys();
            var iterator = GetIterator(keysObj);
            var k4 = 0;
            while (true) {
              var next = IteratorStep(iterator);
              if (!next) {
                keys.length = k4;
                return keys;
              }
              var nextValue = IteratorValue(next);
              try {
                keys[k4] = nextValue;
              } catch (e) {
                try {
                  IteratorClose(iterator);
                } finally {
                  throw e;
                }
              }
              k4++;
            }
          }
          function OrdinaryDeleteMetadata(MetadataKey, O5, P4) {
            var metadataMap = GetOrCreateMetadataMap(
              O5,
              P4,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return false;
            if (!metadataMap.delete(MetadataKey))
              return false;
            if (metadataMap.size === 0) {
              var targetMetadata = metadata3.get(O5);
              if (!IsUndefined(targetMetadata)) {
                targetMetadata.delete(P4);
                if (targetMetadata.size === 0) {
                  metadata3.delete(targetMetadata);
                }
              }
            }
            return true;
          }
        }
        function CreateFallbackProvider(reflect) {
          var defineMetadata2 = reflect.defineMetadata, hasOwnMetadata2 = reflect.hasOwnMetadata, getOwnMetadata2 = reflect.getOwnMetadata, getOwnMetadataKeys2 = reflect.getOwnMetadataKeys, deleteMetadata2 = reflect.deleteMetadata;
          var metadataOwner = new _WeakMap();
          var provider = {
            isProviderFor: function(O5, P4) {
              var metadataPropertySet = metadataOwner.get(O5);
              if (!IsUndefined(metadataPropertySet) && metadataPropertySet.has(P4)) {
                return true;
              }
              if (getOwnMetadataKeys2(O5, P4).length) {
                if (IsUndefined(metadataPropertySet)) {
                  metadataPropertySet = new _Set();
                  metadataOwner.set(O5, metadataPropertySet);
                }
                metadataPropertySet.add(P4);
                return true;
              }
              return false;
            },
            OrdinaryDefineOwnMetadata: defineMetadata2,
            OrdinaryHasOwnMetadata: hasOwnMetadata2,
            OrdinaryGetOwnMetadata: getOwnMetadata2,
            OrdinaryOwnMetadataKeys: getOwnMetadataKeys2,
            OrdinaryDeleteMetadata: deleteMetadata2
          };
          return provider;
        }
        function GetMetadataProvider(O5, P4, Create) {
          var registeredProvider = metadataRegistry.getProvider(O5, P4);
          if (!IsUndefined(registeredProvider)) {
            return registeredProvider;
          }
          if (Create) {
            if (metadataRegistry.setProvider(O5, P4, metadataProvider)) {
              return metadataProvider;
            }
            throw new Error("Illegal state.");
          }
          return void 0;
        }
        function CreateMapPolyfill() {
          var cacheSentinel = {};
          var arraySentinel = [];
          var MapIterator = (
            /** @class */
            (function() {
              function MapIterator2(keys, values, selector) {
                this._index = 0;
                this._keys = keys;
                this._values = values;
                this._selector = selector;
              }
              MapIterator2.prototype["@@iterator"] = function() {
                return this;
              };
              MapIterator2.prototype[iteratorSymbol] = function() {
                return this;
              };
              MapIterator2.prototype.next = function() {
                var index = this._index;
                if (index >= 0 && index < this._keys.length) {
                  var result = this._selector(this._keys[index], this._values[index]);
                  if (index + 1 >= this._keys.length) {
                    this._index = -1;
                    this._keys = arraySentinel;
                    this._values = arraySentinel;
                  } else {
                    this._index++;
                  }
                  return { value: result, done: false };
                }
                return { value: void 0, done: true };
              };
              MapIterator2.prototype.throw = function(error) {
                if (this._index >= 0) {
                  this._index = -1;
                  this._keys = arraySentinel;
                  this._values = arraySentinel;
                }
                throw error;
              };
              MapIterator2.prototype.return = function(value) {
                if (this._index >= 0) {
                  this._index = -1;
                  this._keys = arraySentinel;
                  this._values = arraySentinel;
                }
                return { value, done: true };
              };
              return MapIterator2;
            })()
          );
          var Map2 = (
            /** @class */
            (function() {
              function Map3() {
                this._keys = [];
                this._values = [];
                this._cacheKey = cacheSentinel;
                this._cacheIndex = -2;
              }
              Object.defineProperty(Map3.prototype, "size", {
                get: function() {
                  return this._keys.length;
                },
                enumerable: true,
                configurable: true
              });
              Map3.prototype.has = function(key) {
                return this._find(
                  key,
                  /*insert*/
                  false
                ) >= 0;
              };
              Map3.prototype.get = function(key) {
                var index = this._find(
                  key,
                  /*insert*/
                  false
                );
                return index >= 0 ? this._values[index] : void 0;
              };
              Map3.prototype.set = function(key, value) {
                var index = this._find(
                  key,
                  /*insert*/
                  true
                );
                this._values[index] = value;
                return this;
              };
              Map3.prototype.delete = function(key) {
                var index = this._find(
                  key,
                  /*insert*/
                  false
                );
                if (index >= 0) {
                  var size = this._keys.length;
                  for (var i3 = index + 1; i3 < size; i3++) {
                    this._keys[i3 - 1] = this._keys[i3];
                    this._values[i3 - 1] = this._values[i3];
                  }
                  this._keys.length--;
                  this._values.length--;
                  if (SameValueZero(key, this._cacheKey)) {
                    this._cacheKey = cacheSentinel;
                    this._cacheIndex = -2;
                  }
                  return true;
                }
                return false;
              };
              Map3.prototype.clear = function() {
                this._keys.length = 0;
                this._values.length = 0;
                this._cacheKey = cacheSentinel;
                this._cacheIndex = -2;
              };
              Map3.prototype.keys = function() {
                return new MapIterator(this._keys, this._values, getKey);
              };
              Map3.prototype.values = function() {
                return new MapIterator(this._keys, this._values, getValue2);
              };
              Map3.prototype.entries = function() {
                return new MapIterator(this._keys, this._values, getEntry);
              };
              Map3.prototype["@@iterator"] = function() {
                return this.entries();
              };
              Map3.prototype[iteratorSymbol] = function() {
                return this.entries();
              };
              Map3.prototype._find = function(key, insert) {
                if (!SameValueZero(this._cacheKey, key)) {
                  this._cacheIndex = -1;
                  for (var i3 = 0; i3 < this._keys.length; i3++) {
                    if (SameValueZero(this._keys[i3], key)) {
                      this._cacheIndex = i3;
                      break;
                    }
                  }
                }
                if (this._cacheIndex < 0 && insert) {
                  this._cacheIndex = this._keys.length;
                  this._keys.push(key);
                  this._values.push(void 0);
                }
                return this._cacheIndex;
              };
              return Map3;
            })()
          );
          return Map2;
          function getKey(key, _3) {
            return key;
          }
          function getValue2(_3, value) {
            return value;
          }
          function getEntry(key, value) {
            return [key, value];
          }
        }
        function CreateSetPolyfill() {
          var Set2 = (
            /** @class */
            (function() {
              function Set3() {
                this._map = new _Map();
              }
              Object.defineProperty(Set3.prototype, "size", {
                get: function() {
                  return this._map.size;
                },
                enumerable: true,
                configurable: true
              });
              Set3.prototype.has = function(value) {
                return this._map.has(value);
              };
              Set3.prototype.add = function(value) {
                return this._map.set(value, value), this;
              };
              Set3.prototype.delete = function(value) {
                return this._map.delete(value);
              };
              Set3.prototype.clear = function() {
                this._map.clear();
              };
              Set3.prototype.keys = function() {
                return this._map.keys();
              };
              Set3.prototype.values = function() {
                return this._map.keys();
              };
              Set3.prototype.entries = function() {
                return this._map.entries();
              };
              Set3.prototype["@@iterator"] = function() {
                return this.keys();
              };
              Set3.prototype[iteratorSymbol] = function() {
                return this.keys();
              };
              return Set3;
            })()
          );
          return Set2;
        }
        function CreateWeakMapPolyfill() {
          var UUID_SIZE = 16;
          var keys = HashMap.create();
          var rootKey = CreateUniqueKey();
          return (
            /** @class */
            (function() {
              function WeakMap2() {
                this._key = CreateUniqueKey();
              }
              WeakMap2.prototype.has = function(target) {
                var table = GetOrCreateWeakMapTable(
                  target,
                  /*create*/
                  false
                );
                return table !== void 0 ? HashMap.has(table, this._key) : false;
              };
              WeakMap2.prototype.get = function(target) {
                var table = GetOrCreateWeakMapTable(
                  target,
                  /*create*/
                  false
                );
                return table !== void 0 ? HashMap.get(table, this._key) : void 0;
              };
              WeakMap2.prototype.set = function(target, value) {
                var table = GetOrCreateWeakMapTable(
                  target,
                  /*create*/
                  true
                );
                table[this._key] = value;
                return this;
              };
              WeakMap2.prototype.delete = function(target) {
                var table = GetOrCreateWeakMapTable(
                  target,
                  /*create*/
                  false
                );
                return table !== void 0 ? delete table[this._key] : false;
              };
              WeakMap2.prototype.clear = function() {
                this._key = CreateUniqueKey();
              };
              return WeakMap2;
            })()
          );
          function CreateUniqueKey() {
            var key;
            do
              key = "@@WeakMap@@" + CreateUUID();
            while (HashMap.has(keys, key));
            keys[key] = true;
            return key;
          }
          function GetOrCreateWeakMapTable(target, create) {
            if (!hasOwn.call(target, rootKey)) {
              if (!create)
                return void 0;
              Object.defineProperty(target, rootKey, { value: HashMap.create() });
            }
            return target[rootKey];
          }
          function FillRandomBytes(buffer, size) {
            for (var i3 = 0; i3 < size; ++i3)
              buffer[i3] = Math.random() * 255 | 0;
            return buffer;
          }
          function GenRandomBytes(size) {
            if (typeof Uint8Array === "function") {
              var array = new Uint8Array(size);
              if (typeof crypto !== "undefined") {
                crypto.getRandomValues(array);
              } else if (typeof msCrypto !== "undefined") {
                msCrypto.getRandomValues(array);
              } else {
                FillRandomBytes(array, size);
              }
              return array;
            }
            return FillRandomBytes(new Array(size), size);
          }
          function CreateUUID() {
            var data = GenRandomBytes(UUID_SIZE);
            data[6] = data[6] & 79 | 64;
            data[8] = data[8] & 191 | 128;
            var result = "";
            for (var offset = 0; offset < UUID_SIZE; ++offset) {
              var byte = data[offset];
              if (offset === 4 || offset === 6 || offset === 8)
                result += "-";
              if (byte < 16)
                result += "0";
              result += byte.toString(16).toLowerCase();
            }
            return result;
          }
        }
        function MakeDictionary(obj) {
          obj.__ = void 0;
          delete obj.__;
          return obj;
        }
      });
    })(Reflect2 || (Reflect2 = {}));
  }
});

// node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/chunk-3WWIVTCY.js
init_chunk_QY3QWFKW();
var hn = {};
F(hn, { ABSTIME: () => Et, ACLITEM: () => Vt, BIT: () => jt, BOOL: () => be, BPCHAR: () => _e, BYTEA: () => ge, CHAR: () => gt, CID: () => St, CIDR: () => Tt, CIRCLE: () => Ut, DATE: () => He, FLOAT4: () => Qe, FLOAT8: () => We, GTSVECTOR: () => rn, INET: () => kt, INT2: () => ve, INT4: () => Ge, INT8: () => we, INTERVAL: () => vt, JSON: () => Ae, JSONB: () => Ye, MACADDR: () => Ot, MACADDR8: () => Nt, MONEY: () => Lt, NUMERIC: () => Wt, OID: () => je, PATH: () => Mt, PG_DEPENDENCIES: () => en, PG_LSN: () => Xt, PG_NDISTINCT: () => Zt, PG_NODE_TREE: () => Bt, POLYGON: () => Rt, REFCURSOR: () => _t, REGCLASS: () => Yt, REGCONFIG: () => sn, REGDICTIONARY: () => an, REGNAMESPACE: () => on, REGOPER: () => Ht, REGOPERATOR: () => qt, REGPROC: () => wt, REGPROCEDURE: () => zt, REGROLE: () => un, REGTYPE: () => $t, RELTIME: () => Ct, SMGR: () => It, TEXT: () => V, TID: () => At, TIME: () => Ft, TIMESTAMP: () => qe, TIMESTAMPTZ: () => xe, TIMETZ: () => Gt, TINTERVAL: () => Pt, TSQUERY: () => nn, TSVECTOR: () => tn, TXID_SNAPSHOT: () => Jt, UUID: () => Kt, VARBIT: () => Qt, VARCHAR: () => ze, XID: () => xt, XML: () => Dt, arrayParser: () => yn, arraySerializer: () => Ke, parseType: () => ue, parsers: () => ln, serializers: () => cn, types: () => $e });
u();
var ht = globalThis.JSON.parse;
var bt = globalThis.JSON.stringify;
var be = 16;
var ge = 17;
var gt = 18;
var we = 20;
var ve = 21;
var Ge = 23;
var wt = 24;
var V = 25;
var je = 26;
var At = 27;
var xt = 28;
var St = 29;
var Ae = 114;
var Dt = 142;
var Bt = 194;
var It = 210;
var Mt = 602;
var Rt = 604;
var Tt = 650;
var Qe = 700;
var We = 701;
var Et = 702;
var Ct = 703;
var Pt = 704;
var Ut = 718;
var Nt = 774;
var Lt = 790;
var Ot = 829;
var kt = 869;
var Vt = 1033;
var _e = 1042;
var ze = 1043;
var He = 1082;
var Ft = 1083;
var qe = 1114;
var xe = 1184;
var vt = 1186;
var Gt = 1266;
var jt = 1560;
var Qt = 1562;
var Wt = 1700;
var _t = 1790;
var zt = 2202;
var Ht = 2203;
var qt = 2204;
var Yt = 2205;
var $t = 2206;
var Kt = 2950;
var Jt = 2970;
var Xt = 3220;
var Zt = 3361;
var en = 3402;
var tn = 3614;
var nn = 3615;
var rn = 3642;
var sn = 3734;
var an = 3769;
var Ye = 3802;
var on = 4089;
var un = 4096;
var $e = { string: { to: V, from: [V, ze, _e], serialize: (e) => {
  if (typeof e == "string") return e;
  if (typeof e == "number") return e.toString();
  throw new Error("Invalid input for string type");
}, parse: (e) => e }, number: { to: 0, from: [ve, Ge, je, Qe, We], serialize: (e) => e.toString(), parse: (e) => +e }, bigint: { to: we, from: [we], serialize: (e) => e.toString(), parse: (e) => {
  let t2 = BigInt(e);
  return t2 < Number.MIN_SAFE_INTEGER || t2 > Number.MAX_SAFE_INTEGER ? t2 : Number(t2);
} }, json: { to: Ae, from: [Ae, Ye], serialize: (e) => typeof e == "string" ? e : bt(e), parse: (e) => ht(e) }, boolean: { to: be, from: [be], serialize: (e) => {
  if (typeof e != "boolean") throw new Error("Invalid input for boolean type");
  return e ? "t" : "f";
}, parse: (e) => e === "t" }, date: { to: xe, from: [He, qe, xe], serialize: (e) => {
  if (typeof e == "string") return e;
  if (typeof e == "number") return new Date(e).toISOString();
  if (e instanceof Date) return e.toISOString();
  throw new Error("Invalid input for date type");
}, parse: (e) => new Date(e) }, bytea: { to: ge, from: [ge], serialize: (e) => {
  if (!(e instanceof Uint8Array)) throw new Error("Invalid input for bytea type");
  return "\\x" + Array.from(e).map((t2) => t2.toString(16).padStart(2, "0")).join("");
}, parse: (e) => {
  let t2 = e.slice(2);
  return Uint8Array.from({ length: t2.length / 2 }, (n3, r) => parseInt(t2.substring(r * 2, (r + 1) * 2), 16));
} } };
var Se = pn($e);
var ln = Se.parsers;
var cn = Se.serializers;
function ue(e, t2, n3) {
  if (e === null) return null;
  let r = n3?.[t2] ?? Se.parsers[t2];
  return r ? r(e, t2) : e;
}
function pn(e) {
  return Object.keys(e).reduce(({ parsers: t2, serializers: n3 }, r) => {
    let { to: i3, from: a2, serialize: u2, parse: f3 } = e[r];
    return n3[i3] = u2, n3[r] = u2, t2[r] = f3, Array.isArray(a2) ? a2.forEach((c2) => {
      t2[c2] = f3, n3[c2] = u2;
    }) : (t2[a2] = f3, n3[a2] = u2), { parsers: t2, serializers: n3 };
  }, { parsers: {}, serializers: {} });
}
var dn = /\\/g;
var fn = /"/g;
function mn(e) {
  return e.replace(dn, "\\\\").replace(fn, '\\"');
}
function Ke(e, t2, n3) {
  if (Array.isArray(e) === false) return e;
  if (!e.length) return "{}";
  let r = e[0], i3 = n3 === 1020 ? ";" : ",";
  return Array.isArray(r) ? `{${e.map((a2) => Ke(a2, t2, n3)).join(i3)}}` : `{${e.map((a2) => (a2 === void 0 && (a2 = null), a2 === null ? "null" : '"' + mn(t2 ? t2(a2) : a2.toString()) + '"')).join(i3)}}`;
}
var he = { i: 0, char: null, str: "", quoted: false, last: 0, p: null };
function yn(e, t2, n3) {
  return he.i = he.last = 0, Je(he, e, t2, n3)[0];
}
function Je(e, t2, n3, r) {
  let i3 = [], a2 = r === 1020 ? ";" : ",";
  for (; e.i < t2.length; e.i++) {
    if (e.char = t2[e.i], e.quoted) e.char === "\\" ? e.str += t2[++e.i] : e.char === '"' ? (i3.push(n3 ? n3(e.str) : e.str), e.str = "", e.quoted = t2[e.i + 1] === '"', e.last = e.i + 2) : e.str += e.char;
    else if (e.char === '"') e.quoted = true;
    else if (e.char === "{") e.last = ++e.i, i3.push(Je(e, t2, n3, r));
    else if (e.char === "}") {
      e.quoted = false, e.last < e.i && i3.push(n3 ? n3(t2.slice(e.last, e.i)) : t2.slice(e.last, e.i)), e.last = e.i + 1;
      break;
    } else e.char === a2 && e.p !== "}" && e.p !== '"' && (i3.push(n3 ? n3(t2.slice(e.last, e.i)) : t2.slice(e.last, e.i)), e.last = e.i + 1);
    e.p = e.char;
  }
  return e.last < e.i && i3.push(n3 ? n3(t2.slice(e.last, e.i + 1)) : t2.slice(e.last, e.i + 1)), i3;
}
var wn = {};
F(wn, { parseDescribeStatementResults: () => De, parseResults: () => bn });
u();
function bn(e, t2, n3, r) {
  let i3 = [], a2 = { rows: [], fields: [] }, u2 = 0, f3 = { ...t2, ...n3?.parsers };
  return e.forEach((c2) => {
    switch (c2.name) {
      case "rowDescription": {
        let M2 = c2;
        a2.fields = M2.fields.map((E2) => ({ name: E2.name, dataTypeID: E2.dataTypeID }));
        break;
      }
      case "dataRow": {
        if (!a2) break;
        let M2 = c2;
        n3?.rowMode === "array" ? a2.rows.push(M2.fields.map((E2, ie2) => ue(E2, a2.fields[ie2].dataTypeID, f3))) : a2.rows.push(Object.fromEntries(M2.fields.map((E2, ie2) => [a2.fields[ie2].name, ue(E2, a2.fields[ie2].dataTypeID, f3)])));
        break;
      }
      case "commandComplete": {
        u2 += gn(c2), i3.push({ ...a2, affectedRows: u2, ...r ? { blob: r } : {} }), a2 = { rows: [], fields: [] };
        break;
      }
    }
  }), i3.length === 0 && i3.push({ affectedRows: 0, rows: [], fields: [] }), i3;
}
function gn(e) {
  let t2 = e.text.split(" ");
  switch (t2[0]) {
    case "INSERT":
      return parseInt(t2[2], 10);
    case "UPDATE":
    case "DELETE":
    case "COPY":
    case "MERGE":
      return parseInt(t2[1], 10);
    default:
      return 0;
  }
}
function De(e) {
  let t2 = e.find((n3) => n3.name === "parameterDescription");
  return t2 ? t2.dataTypeIDs : [];
}
var Ue = {};
F(Ue, { AuthenticationCleartextPassword: () => v, AuthenticationMD5Password: () => G, AuthenticationOk: () => F2, AuthenticationSASL: () => j, AuthenticationSASLContinue: () => Q, AuthenticationSASLFinal: () => W, BackendKeyDataMessage: () => K, CommandCompleteMessage: () => Z, CopyDataMessage: () => _2, CopyResponse: () => z, DataRowMessage: () => ee, DatabaseError: () => C, Field: () => H, NoticeMessage: () => te, NotificationResponseMessage: () => J, ParameterDescriptionMessage: () => Y, ParameterStatusMessage: () => $, ReadyForQueryMessage: () => X, RowDescriptionMessage: () => q, bindComplete: () => Ie, closeComplete: () => Me, copyDone: () => Pe, emptyQuery: () => Ce, noData: () => Re, parseComplete: () => Be, portalSuspended: () => Te, replicationStart: () => Ee });
u();
var Be = { name: "parseComplete", length: 5 };
var Ie = { name: "bindComplete", length: 5 };
var Me = { name: "closeComplete", length: 5 };
var Re = { name: "noData", length: 5 };
var Te = { name: "portalSuspended", length: 5 };
var Ee = { name: "replicationStart", length: 4 };
var Ce = { name: "emptyQuery", length: 4 };
var Pe = { name: "copyDone", length: 4 };
var F2 = class {
  constructor(t2) {
    this.length = t2;
    this.name = "authenticationOk";
  }
};
var v = class {
  constructor(t2) {
    this.length = t2;
    this.name = "authenticationCleartextPassword";
  }
};
var G = class {
  constructor(t2, n3) {
    this.length = t2;
    this.salt = n3;
    this.name = "authenticationMD5Password";
  }
};
var j = class {
  constructor(t2, n3) {
    this.length = t2;
    this.mechanisms = n3;
    this.name = "authenticationSASL";
  }
};
var Q = class {
  constructor(t2, n3) {
    this.length = t2;
    this.data = n3;
    this.name = "authenticationSASLContinue";
  }
};
var W = class {
  constructor(t2, n3) {
    this.length = t2;
    this.data = n3;
    this.name = "authenticationSASLFinal";
  }
};
var C = class extends Error {
  constructor(n3, r, i3) {
    super(n3);
    this.length = r;
    this.name = i3;
  }
};
var _2 = class {
  constructor(t2, n3) {
    this.length = t2;
    this.chunk = n3;
    this.name = "copyData";
  }
};
var z = class {
  constructor(t2, n3, r, i3) {
    this.length = t2;
    this.name = n3;
    this.binary = r;
    this.columnTypes = new Array(i3);
  }
};
var H = class {
  constructor(t2, n3, r, i3, a2, u2, f3) {
    this.name = t2;
    this.tableID = n3;
    this.columnID = r;
    this.dataTypeID = i3;
    this.dataTypeSize = a2;
    this.dataTypeModifier = u2;
    this.format = f3;
  }
};
var q = class {
  constructor(t2, n3) {
    this.length = t2;
    this.fieldCount = n3;
    this.name = "rowDescription";
    this.fields = new Array(this.fieldCount);
  }
};
var Y = class {
  constructor(t2, n3) {
    this.length = t2;
    this.parameterCount = n3;
    this.name = "parameterDescription";
    this.dataTypeIDs = new Array(this.parameterCount);
  }
};
var $ = class {
  constructor(t2, n3, r) {
    this.length = t2;
    this.parameterName = n3;
    this.parameterValue = r;
    this.name = "parameterStatus";
  }
};
var K = class {
  constructor(t2, n3, r) {
    this.length = t2;
    this.processID = n3;
    this.secretKey = r;
    this.name = "backendKeyData";
  }
};
var J = class {
  constructor(t2, n3, r, i3) {
    this.length = t2;
    this.processId = n3;
    this.channel = r;
    this.payload = i3;
    this.name = "notification";
  }
};
var X = class {
  constructor(t2, n3) {
    this.length = t2;
    this.status = n3;
    this.name = "readyForQuery";
  }
};
var Z = class {
  constructor(t2, n3) {
    this.length = t2;
    this.text = n3;
    this.name = "commandComplete";
  }
};
var ee = class {
  constructor(t2, n3) {
    this.length = t2;
    this.fields = n3;
    this.name = "dataRow";
    this.fieldCount = n3.length;
  }
};
var te = class {
  constructor(t2, n3) {
    this.length = t2;
    this.message = n3;
    this.name = "notice";
  }
};
var zn = {};
F(zn, { Parser: () => ye, messages: () => Ue, serialize: () => k });
u();
u();
u();
u();
function P2(e) {
  let t2 = e.length;
  for (let n3 = e.length - 1; n3 >= 0; n3--) {
    let r = e.charCodeAt(n3);
    r > 127 && r <= 2047 ? t2++ : r > 2047 && r <= 65535 && (t2 += 2), r >= 56320 && r <= 57343 && n3--;
  }
  return t2;
}
var b;
var g2;
var N;
var ce;
var L2;
var x2;
var le;
var U2;
var Xe;
var T2 = class {
  constructor(t2 = 256) {
    this.size = t2;
    R(this, x2);
    R(this, b);
    R(this, g2, 5);
    R(this, N, false);
    R(this, ce, new TextEncoder());
    R(this, L2, 0);
    x(this, b, T(this, x2, le).call(this, t2));
  }
  addInt32(t2) {
    return T(this, x2, U2).call(this, 4), h(this, b).setInt32(h(this, g2), t2, h(this, N)), x(this, g2, h(this, g2) + 4), this;
  }
  addInt16(t2) {
    return T(this, x2, U2).call(this, 2), h(this, b).setInt16(h(this, g2), t2, h(this, N)), x(this, g2, h(this, g2) + 2), this;
  }
  addCString(t2) {
    return t2 && this.addString(t2), T(this, x2, U2).call(this, 1), h(this, b).setUint8(h(this, g2), 0), U(this, g2)._++, this;
  }
  addString(t2 = "") {
    let n3 = P2(t2);
    return T(this, x2, U2).call(this, n3), h(this, ce).encodeInto(t2, new Uint8Array(h(this, b).buffer, h(this, g2))), x(this, g2, h(this, g2) + n3), this;
  }
  add(t2) {
    return T(this, x2, U2).call(this, t2.byteLength), new Uint8Array(h(this, b).buffer).set(new Uint8Array(t2), h(this, g2)), x(this, g2, h(this, g2) + t2.byteLength), this;
  }
  flush(t2) {
    let n3 = T(this, x2, Xe).call(this, t2);
    return x(this, g2, 5), x(this, b, T(this, x2, le).call(this, this.size)), new Uint8Array(n3);
  }
};
b = /* @__PURE__ */ new WeakMap(), g2 = /* @__PURE__ */ new WeakMap(), N = /* @__PURE__ */ new WeakMap(), ce = /* @__PURE__ */ new WeakMap(), L2 = /* @__PURE__ */ new WeakMap(), x2 = /* @__PURE__ */ new WeakSet(), le = function(t2) {
  return new DataView(new ArrayBuffer(t2));
}, U2 = function(t2) {
  if (h(this, b).byteLength - h(this, g2) < t2) {
    let r = h(this, b).buffer, i3 = r.byteLength + (r.byteLength >> 1) + t2;
    x(this, b, T(this, x2, le).call(this, i3)), new Uint8Array(h(this, b).buffer).set(new Uint8Array(r));
  }
}, Xe = function(t2) {
  if (t2) {
    h(this, b).setUint8(h(this, L2), t2);
    let n3 = h(this, g2) - (h(this, L2) + 1);
    h(this, b).setInt32(h(this, L2) + 1, n3, h(this, N));
  }
  return h(this, b).buffer.slice(t2 ? 0 : 5, h(this, g2));
};
var m = new T2();
var An = (e) => {
  m.addInt16(3).addInt16(0);
  for (let r of Object.keys(e)) m.addCString(r).addCString(e[r]);
  m.addCString("client_encoding").addCString("UTF8");
  let t2 = m.addCString("").flush(), n3 = t2.byteLength + 4;
  return new T2().addInt32(n3).add(t2).flush();
};
var xn = () => {
  let e = new DataView(new ArrayBuffer(8));
  return e.setInt32(0, 8, false), e.setInt32(4, 80877103, false), new Uint8Array(e.buffer);
};
var Sn = (e) => m.addCString(e).flush(112);
var Dn = (e, t2) => (m.addCString(e).addInt32(P2(t2)).addString(t2), m.flush(112));
var Bn = (e) => m.addString(e).flush(112);
var In = (e) => m.addCString(e).flush(81);
var Mn = [];
var Rn = (e) => {
  let t2 = e.name ?? "";
  t2.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", t2, t2.length), console.error("This can cause conflicts and silent errors executing queries"));
  let n3 = m.addCString(t2).addCString(e.text).addInt16(e.types?.length ?? 0);
  return e.types?.forEach((r) => n3.addInt32(r)), m.flush(80);
};
var O = new T2();
var Tn = (e, t2) => {
  for (let n3 = 0; n3 < e.length; n3++) {
    let r = t2 ? t2(e[n3], n3) : e[n3];
    if (r === null) m.addInt16(0), O.addInt32(-1);
    else if (r instanceof ArrayBuffer || ArrayBuffer.isView(r)) {
      let i3 = ArrayBuffer.isView(r) ? r.buffer.slice(r.byteOffset, r.byteOffset + r.byteLength) : r;
      m.addInt16(1), O.addInt32(i3.byteLength), O.add(i3);
    } else m.addInt16(0), O.addInt32(P2(r)), O.addString(r);
  }
};
var En = (e = {}) => {
  let t2 = e.portal ?? "", n3 = e.statement ?? "", r = e.binary ?? false, i3 = e.values ?? Mn, a2 = i3.length;
  return m.addCString(t2).addCString(n3), m.addInt16(a2), Tn(i3, e.valueMapper), m.addInt16(a2), m.add(O.flush()), m.addInt16(r ? 1 : 0), m.flush(66);
};
var Cn = new Uint8Array([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
var Pn = (e) => {
  if (!e || !e.portal && !e.rows) return Cn;
  let t2 = e.portal ?? "", n3 = e.rows ?? 0, r = P2(t2), i3 = 4 + r + 1 + 4, a2 = new DataView(new ArrayBuffer(1 + i3));
  return a2.setUint8(0, 69), a2.setInt32(1, i3, false), new TextEncoder().encodeInto(t2, new Uint8Array(a2.buffer, 5)), a2.setUint8(r + 5, 0), a2.setUint32(a2.byteLength - 4, n3, false), new Uint8Array(a2.buffer);
};
var Un = (e, t2) => {
  let n3 = new DataView(new ArrayBuffer(16));
  return n3.setInt32(0, 16, false), n3.setInt16(4, 1234, false), n3.setInt16(6, 5678, false), n3.setInt32(8, e, false), n3.setInt32(12, t2, false), new Uint8Array(n3.buffer);
};
var Ne = (e, t2) => {
  let n3 = new T2();
  return n3.addCString(t2), n3.flush(e);
};
var Nn = m.addCString("P").flush(68);
var Ln = m.addCString("S").flush(68);
var On = (e) => e.name ? Ne(68, `${e.type}${e.name ?? ""}`) : e.type === "P" ? Nn : Ln;
var kn = (e) => {
  let t2 = `${e.type}${e.name ?? ""}`;
  return Ne(67, t2);
};
var Vn = (e) => m.add(e).flush(100);
var Fn = (e) => Ne(102, e);
var pe = (e) => new Uint8Array([e, 0, 0, 0, 4]);
var vn = pe(72);
var Gn = pe(83);
var jn = pe(88);
var Qn = pe(99);
var k = { startup: An, password: Sn, requestSsl: xn, sendSASLInitialResponseMessage: Dn, sendSCRAMClientFinalMessage: Bn, query: In, parse: Rn, bind: En, execute: Pn, describe: On, close: kn, flush: () => vn, sync: () => Gn, end: () => jn, copyData: Vn, copyDone: () => Qn, copyFail: Fn, cancel: Un };
u();
u();
var Le = { text: 0, binary: 1 };
u();
var Wn = new ArrayBuffer(0);
var R2;
var w;
var fe;
var me;
var ne;
var de = class {
  constructor(t2 = 0) {
    R(this, R2, new DataView(Wn));
    R(this, w);
    R(this, fe, "utf-8");
    R(this, me, new TextDecoder(h(this, fe)));
    R(this, ne, false);
    x(this, w, t2);
  }
  setBuffer(t2, n3) {
    x(this, w, t2), x(this, R2, new DataView(n3));
  }
  int16() {
    let t2 = h(this, R2).getInt16(h(this, w), h(this, ne));
    return x(this, w, h(this, w) + 2), t2;
  }
  byte() {
    let t2 = h(this, R2).getUint8(h(this, w));
    return U(this, w)._++, t2;
  }
  int32() {
    let t2 = h(this, R2).getInt32(h(this, w), h(this, ne));
    return x(this, w, h(this, w) + 4), t2;
  }
  string(t2) {
    return h(this, me).decode(this.bytes(t2));
  }
  cstring() {
    let t2 = h(this, w), n3 = t2;
    for (; h(this, R2).getUint8(n3++) !== 0; ) ;
    let r = this.string(n3 - t2 - 1);
    return x(this, w, n3), r;
  }
  bytes(t2) {
    let n3 = h(this, R2).buffer.slice(h(this, w), h(this, w) + t2);
    return x(this, w, h(this, w) + t2), new Uint8Array(n3);
  }
};
R2 = /* @__PURE__ */ new WeakMap(), w = /* @__PURE__ */ new WeakMap(), fe = /* @__PURE__ */ new WeakMap(), me = /* @__PURE__ */ new WeakMap(), ne = /* @__PURE__ */ new WeakMap();
var Oe = 1;
var _n = 4;
var Ze = Oe + _n;
var et = new ArrayBuffer(0);
var A;
var S;
var D2;
var o;
var l2;
var tt;
var nt;
var rt;
var st;
var it;
var at;
var ot;
var ke;
var ut;
var lt;
var ct;
var pt;
var dt;
var ft;
var mt;
var yt;
var Ve;
var ye = class {
  constructor() {
    R(this, l2);
    R(this, A, new DataView(et));
    R(this, S, 0);
    R(this, D2, 0);
    R(this, o, new de());
  }
  parse(t2, n3) {
    T(this, l2, tt).call(this, ArrayBuffer.isView(t2) ? t2.buffer.slice(t2.byteOffset, t2.byteOffset + t2.byteLength) : t2);
    let r = h(this, D2) + h(this, S), i3 = h(this, D2);
    for (; i3 + Ze <= r; ) {
      let a2 = h(this, A).getUint8(i3), u2 = h(this, A).getUint32(i3 + Oe, false), f3 = Oe + u2;
      if (f3 + i3 <= r && u2 > 0) {
        let c2 = T(this, l2, nt).call(this, i3 + Ze, a2, u2, h(this, A).buffer);
        n3(c2), i3 += f3;
      } else break;
    }
    i3 === r ? (x(this, A, new DataView(et)), x(this, S, 0), x(this, D2, 0)) : (x(this, S, r - i3), x(this, D2, i3));
  }
};
A = /* @__PURE__ */ new WeakMap(), S = /* @__PURE__ */ new WeakMap(), D2 = /* @__PURE__ */ new WeakMap(), o = /* @__PURE__ */ new WeakMap(), l2 = /* @__PURE__ */ new WeakSet(), tt = function(t2) {
  if (h(this, S) > 0) {
    let n3 = h(this, S) + t2.byteLength;
    if (n3 + h(this, D2) > h(this, A).byteLength) {
      let i3;
      if (n3 <= h(this, A).byteLength && h(this, D2) >= h(this, S)) i3 = h(this, A).buffer;
      else {
        let a2 = h(this, A).byteLength * 2;
        for (; n3 >= a2; ) a2 *= 2;
        i3 = new ArrayBuffer(a2);
      }
      new Uint8Array(i3).set(new Uint8Array(h(this, A).buffer, h(this, D2), h(this, S))), x(this, A, new DataView(i3)), x(this, D2, 0);
    }
    new Uint8Array(h(this, A).buffer).set(new Uint8Array(t2), h(this, D2) + h(this, S)), x(this, S, n3);
  } else x(this, A, new DataView(t2)), x(this, D2, 0), x(this, S, t2.byteLength);
}, nt = function(t2, n3, r, i3) {
  switch (n3) {
    case 50:
      return Ie;
    case 49:
      return Be;
    case 51:
      return Me;
    case 110:
      return Re;
    case 115:
      return Te;
    case 99:
      return Pe;
    case 87:
      return Ee;
    case 73:
      return Ce;
    case 68:
      return T(this, l2, dt).call(this, t2, r, i3);
    case 67:
      return T(this, l2, st).call(this, t2, r, i3);
    case 90:
      return T(this, l2, rt).call(this, t2, r, i3);
    case 65:
      return T(this, l2, ut).call(this, t2, r, i3);
    case 82:
      return T(this, l2, yt).call(this, t2, r, i3);
    case 83:
      return T(this, l2, ft).call(this, t2, r, i3);
    case 75:
      return T(this, l2, mt).call(this, t2, r, i3);
    case 69:
      return T(this, l2, Ve).call(this, t2, r, i3, "error");
    case 78:
      return T(this, l2, Ve).call(this, t2, r, i3, "notice");
    case 84:
      return T(this, l2, lt).call(this, t2, r, i3);
    case 116:
      return T(this, l2, pt).call(this, t2, r, i3);
    case 71:
      return T(this, l2, at).call(this, t2, r, i3);
    case 72:
      return T(this, l2, ot).call(this, t2, r, i3);
    case 100:
      return T(this, l2, it).call(this, t2, r, i3);
    default:
      return new C("received invalid response: " + n3.toString(16), r, "error");
  }
}, rt = function(t2, n3, r) {
  h(this, o).setBuffer(t2, r);
  let i3 = h(this, o).string(1);
  return new X(n3, i3);
}, st = function(t2, n3, r) {
  h(this, o).setBuffer(t2, r);
  let i3 = h(this, o).cstring();
  return new Z(n3, i3);
}, it = function(t2, n3, r) {
  let i3 = r.slice(t2, t2 + (n3 - 4));
  return new _2(n3, new Uint8Array(i3));
}, at = function(t2, n3, r) {
  return T(this, l2, ke).call(this, t2, n3, r, "copyInResponse");
}, ot = function(t2, n3, r) {
  return T(this, l2, ke).call(this, t2, n3, r, "copyOutResponse");
}, ke = function(t2, n3, r, i3) {
  h(this, o).setBuffer(t2, r);
  let a2 = h(this, o).byte() !== 0, u2 = h(this, o).int16(), f3 = new z(n3, i3, a2, u2);
  for (let c2 = 0; c2 < u2; c2++) f3.columnTypes[c2] = h(this, o).int16();
  return f3;
}, ut = function(t2, n3, r) {
  h(this, o).setBuffer(t2, r);
  let i3 = h(this, o).int32(), a2 = h(this, o).cstring(), u2 = h(this, o).cstring();
  return new J(n3, i3, a2, u2);
}, lt = function(t2, n3, r) {
  h(this, o).setBuffer(t2, r);
  let i3 = h(this, o).int16(), a2 = new q(n3, i3);
  for (let u2 = 0; u2 < i3; u2++) a2.fields[u2] = T(this, l2, ct).call(this);
  return a2;
}, ct = function() {
  let t2 = h(this, o).cstring(), n3 = h(this, o).int32(), r = h(this, o).int16(), i3 = h(this, o).int32(), a2 = h(this, o).int16(), u2 = h(this, o).int32(), f3 = h(this, o).int16() === 0 ? Le.text : Le.binary;
  return new H(t2, n3, r, i3, a2, u2, f3);
}, pt = function(t2, n3, r) {
  h(this, o).setBuffer(t2, r);
  let i3 = h(this, o).int16(), a2 = new Y(n3, i3);
  for (let u2 = 0; u2 < i3; u2++) a2.dataTypeIDs[u2] = h(this, o).int32();
  return a2;
}, dt = function(t2, n3, r) {
  h(this, o).setBuffer(t2, r);
  let i3 = h(this, o).int16(), a2 = new Array(i3);
  for (let u2 = 0; u2 < i3; u2++) {
    let f3 = h(this, o).int32();
    a2[u2] = f3 === -1 ? null : h(this, o).string(f3);
  }
  return new ee(n3, a2);
}, ft = function(t2, n3, r) {
  h(this, o).setBuffer(t2, r);
  let i3 = h(this, o).cstring(), a2 = h(this, o).cstring();
  return new $(n3, i3, a2);
}, mt = function(t2, n3, r) {
  h(this, o).setBuffer(t2, r);
  let i3 = h(this, o).int32(), a2 = h(this, o).int32();
  return new K(n3, i3, a2);
}, yt = function(t2, n3, r) {
  h(this, o).setBuffer(t2, r);
  let i3 = h(this, o).int32();
  switch (i3) {
    case 0:
      return new F2(n3);
    case 3:
      return new v(n3);
    case 5:
      return new G(n3, h(this, o).bytes(4));
    case 10: {
      let a2 = [];
      for (; ; ) {
        let u2 = h(this, o).cstring();
        if (u2.length === 0) return new j(n3, a2);
        a2.push(u2);
      }
    }
    case 11:
      return new Q(n3, h(this, o).string(n3 - 8));
    case 12:
      return new W(n3, h(this, o).string(n3 - 8));
    default:
      throw new Error("Unknown authenticationOk message type " + i3);
  }
}, Ve = function(t2, n3, r, i3) {
  h(this, o).setBuffer(t2, r);
  let a2 = {}, u2 = h(this, o).string(1);
  for (; u2 !== "\0"; ) a2[u2] = h(this, o).cstring(), u2 = h(this, o).string(1);
  let f3 = a2.M, c2 = i3 === "notice" ? new te(n3, f3) : new C(f3, n3, i3);
  return c2.severity = a2.S, c2.code = a2.C, c2.detail = a2.D, c2.hint = a2.H, c2.position = a2.P, c2.internalPosition = a2.p, c2.internalQuery = a2.q, c2.where = a2.W, c2.schema = a2.s, c2.table = a2.t, c2.column = a2.c, c2.dataType = a2.d, c2.constraint = a2.n, c2.file = a2.F, c2.line = a2.L, c2.routine = a2.R, c2;
};
u();
var Fe = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
var se;
async function Rr() {
  if (Fe || se) return;
  let e = new URL("./pglite.wasm", import.meta.url);
  se = fetch(e);
}
var re;
async function Tr(e, t2) {
  if (t2 || re) return { instance: await WebAssembly.instantiate(t2 || re, e), module: t2 || re };
  let n3 = new URL("./pglite.wasm", import.meta.url);
  if (Fe) {
    let i3 = await (await Promise.resolve().then(() => __toESM(require_promises(), 1))).readFile(n3), { module: a2, instance: u2 } = await WebAssembly.instantiate(i3, e);
    return re = a2, { instance: u2, module: a2 };
  } else {
    se || (se = fetch(n3));
    let r = await se, { module: i3, instance: a2 } = await WebAssembly.instantiateStreaming(r, e);
    return re = i3, { instance: a2, module: i3 };
  }
}
async function Er() {
  let e = new URL("./pglite.data", import.meta.url);
  return Fe ? (await (await Promise.resolve().then(() => __toESM(require_promises(), 1))).readFile(e)).buffer : (await fetch(e)).arrayBuffer();
}
function Nr(e) {
  let t2;
  return e.startsWith('"') && e.endsWith('"') ? t2 = e.substring(1, e.length - 1) : t2 = e.toLowerCase(), t2;
}

// node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/chunk-F4GETNPB.js
init_chunk_QY3QWFKW();
u();
var o2 = { part: "part", container: "container" };
function s2(t2, r, ...e) {
  let a2 = t2.length - 1, p4 = e.length - 1;
  if (p4 !== -1) {
    if (p4 === 0) {
      t2[a2] = t2[a2] + e[0] + r;
      return;
    }
    t2[a2] = t2[a2] + e[0], t2.push(...e.slice(1, p4)), t2.push(e[p4] + r);
  }
}
function y(t2, ...r) {
  let e = [t2[0]];
  e.raw = [t2.raw[0]];
  let a2 = [];
  for (let p4 = 0; p4 < r.length; p4++) {
    let n3 = r[p4], i3 = p4 + 1;
    if (n3?._templateType === o2.part) {
      s2(e, t2[i3], n3.str), s2(e.raw, t2.raw[i3], n3.str);
      continue;
    }
    if (n3?._templateType === o2.container) {
      s2(e, t2[i3], ...n3.strings), s2(e.raw, t2.raw[i3], ...n3.strings.raw), a2.push(...n3.values);
      continue;
    }
    e.push(t2[i3]), e.raw.push(t2.raw[i3]), a2.push(n3);
  }
  return { _templateType: "container", strings: e, values: a2 };
}
function g3(t2, ...r) {
  let { strings: e, values: a2 } = y(t2, ...r);
  return { query: [e[0], ...a2.flatMap((p4, n3) => [`$${n3 + 1}`, e[n3 + 1]])].join(""), params: a2 };
}

// node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/chunk-F2DQ4FIK.js
init_chunk_QY3QWFKW();
u();
u();
function E(m4) {
  let s4 = m4.e;
  return s4.query = m4.query, s4.params = m4.params, s4.queryOptions = m4.options, s4;
}
var T3;
var p2;
var t;
var y2;
var x3;
var h2;
var O2;
var k2 = class {
  constructor() {
    R(this, t);
    this.serializers = { ...cn };
    this.parsers = { ...ln };
    R(this, T3, false);
    R(this, p2, false);
  }
  async _initArrayTypes({ force: s4 = false } = {}) {
    if (h(this, T3) && !s4) return;
    x(this, T3, true);
    let e = await this.query(`
      SELECT b.oid, b.typarray
      FROM pg_catalog.pg_type a
      LEFT JOIN pg_catalog.pg_type b ON b.oid = a.typelem
      WHERE a.typcategory = 'A'
      GROUP BY b.oid, b.typarray
      ORDER BY b.oid
    `);
    for (let r of e.rows) this.serializers[r.typarray] = (o4) => Ke(o4, this.serializers[r.oid], r.typarray), this.parsers[r.typarray] = (o4) => yn(o4, this.parsers[r.oid], r.typarray);
  }
  async refreshArrayTypes() {
    await this._initArrayTypes({ force: true });
  }
  async query(s4, e, r) {
    return await this._checkReady(), await this._runExclusiveTransaction(async () => await T(this, t, x3).call(this, s4, e, r));
  }
  async sql(s4, ...e) {
    let { query: r, params: o4 } = g3(s4, ...e);
    return await this.query(r, o4);
  }
  async exec(s4, e) {
    return await this._checkReady(), await this._runExclusiveTransaction(async () => await T(this, t, h2).call(this, s4, e));
  }
  async describeQuery(s4, e) {
    let r = [];
    try {
      await T(this, t, y2).call(this, k.parse({ text: s4, types: e?.paramTypes }), e), r = await T(this, t, y2).call(this, k.describe({ type: "S" }), e);
    } catch (n3) {
      throw n3 instanceof C ? E({ e: n3, options: e, params: void 0, query: s4 }) : n3;
    } finally {
      r.push(...await T(this, t, y2).call(this, k.sync(), e));
    }
    let o4 = r.find((n3) => n3.name === "parameterDescription"), i3 = r.find((n3) => n3.name === "rowDescription"), c2 = o4?.dataTypeIDs.map((n3) => ({ dataTypeID: n3, serializer: this.serializers[n3] })) ?? [], u2 = i3?.fields.map((n3) => ({ name: n3.name, dataTypeID: n3.dataTypeID, parser: this.parsers[n3.dataTypeID] })) ?? [];
    return { queryParams: c2, resultFields: u2 };
  }
  async transaction(s4) {
    return await this._checkReady(), await this._runExclusiveTransaction(async () => {
      await T(this, t, h2).call(this, "BEGIN"), x(this, p2, true);
      let e = false, r = () => {
        if (e) throw new Error("Transaction is closed");
      }, o4 = { query: async (i3, c2, u2) => (r(), await T(this, t, x3).call(this, i3, c2, u2)), sql: async (i3, ...c2) => {
        let { query: u2, params: n3 } = g3(i3, ...c2);
        return await T(this, t, x3).call(this, u2, n3);
      }, exec: async (i3, c2) => (r(), await T(this, t, h2).call(this, i3, c2)), rollback: async () => {
        r(), await T(this, t, h2).call(this, "ROLLBACK"), e = true;
      }, listen: async (i3, c2) => (r(), await this.listen(i3, c2, o4)), get closed() {
        return e;
      } };
      try {
        let i3 = await s4(o4);
        return e || (e = true, await T(this, t, h2).call(this, "COMMIT")), x(this, p2, false), i3;
      } catch (i3) {
        throw e || await T(this, t, h2).call(this, "ROLLBACK"), x(this, p2, false), i3;
      }
    });
  }
  async runExclusive(s4) {
    return await this._runExclusiveQuery(s4);
  }
};
T3 = /* @__PURE__ */ new WeakMap(), p2 = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakSet(), y2 = async function(s4, e = {}) {
  return await this.execProtocolStream(s4, { ...e, syncToFs: false });
}, x3 = async function(s4, e = [], r) {
  return await this._runExclusiveQuery(async () => {
    T(this, t, O2).call(this, "runQuery", s4, e, r), await this._handleBlob(r?.blob);
    let o4 = [];
    try {
      let c2 = await T(this, t, y2).call(this, k.parse({ text: s4, types: r?.paramTypes }), r), u2 = De(await T(this, t, y2).call(this, k.describe({ type: "S" }), r)), n3 = e.map((b3, S3) => {
        let D4 = u2[S3];
        if (b3 == null) return null;
        let Q3 = r?.serializers?.[D4] ?? this.serializers[D4];
        return Q3 ? Q3(b3) : b3.toString();
      });
      o4 = [...c2, ...await T(this, t, y2).call(this, k.bind({ values: n3 }), r), ...await T(this, t, y2).call(this, k.describe({ type: "P" }), r), ...await T(this, t, y2).call(this, k.execute({}), r)];
    } catch (c2) {
      throw c2 instanceof C ? E({ e: c2, options: r, params: e, query: s4 }) : c2;
    } finally {
      o4.push(...await T(this, t, y2).call(this, k.sync(), r));
    }
    await this._cleanupBlob(), h(this, p2) || await this.syncToFs();
    let i3 = await this._getWrittenBlob();
    return bn(o4, this.parsers, r, i3)[0];
  });
}, h2 = async function(s4, e) {
  return await this._runExclusiveQuery(async () => {
    T(this, t, O2).call(this, "runExec", s4, e), await this._handleBlob(e?.blob);
    let r = [];
    try {
      r = await T(this, t, y2).call(this, k.query(s4), e);
    } catch (i3) {
      throw i3 instanceof C ? E({ e: i3, options: e, params: void 0, query: s4 }) : i3;
    } finally {
      r.push(...await T(this, t, y2).call(this, k.sync(), e));
    }
    this._cleanupBlob(), h(this, p2) || await this.syncToFs();
    let o4 = await this._getWrittenBlob();
    return bn(r, this.parsers, e, o4);
  });
}, O2 = function(...s4) {
  this.debug > 0 && console.log(...s4);
};

// node_modules/.pnpm/@electric-sql+pglite@0.3.14/node_modules/@electric-sql/pglite/dist/index.js
init_chunk_VBDAOXYI();
init_chunk_QY3QWFKW();
u();
u();
u();
var dt2 = new Error("timeout while waiting for mutex to become available");
var mt2 = new Error("mutex already locked");
var ot2 = new Error("request for lock canceled");
var nt2 = function(e, t2, r, a2) {
  function s4(o4) {
    return o4 instanceof r ? o4 : new r(function(n3) {
      n3(o4);
    });
  }
  return new (r || (r = Promise))(function(o4, n3) {
    function _3(m4) {
      try {
        p4(a2.next(m4));
      } catch (d2) {
        n3(d2);
      }
    }
    function l3(m4) {
      try {
        p4(a2.throw(m4));
      } catch (d2) {
        n3(d2);
      }
    }
    function p4(m4) {
      m4.done ? o4(m4.value) : s4(m4.value).then(_3, l3);
    }
    p4((a2 = a2.apply(e, t2 || [])).next());
  });
};
var Fe2 = class {
  constructor(t2, r = ot2) {
    this._value = t2, this._cancelError = r, this._weightedQueues = [], this._weightedWaiters = [];
  }
  acquire(t2 = 1) {
    if (t2 <= 0) throw new Error(`invalid weight ${t2}: must be positive`);
    return new Promise((r, a2) => {
      this._weightedQueues[t2 - 1] || (this._weightedQueues[t2 - 1] = []), this._weightedQueues[t2 - 1].push({ resolve: r, reject: a2 }), this._dispatch();
    });
  }
  runExclusive(t2, r = 1) {
    return nt2(this, void 0, void 0, function* () {
      let [a2, s4] = yield this.acquire(r);
      try {
        return yield t2(a2);
      } finally {
        s4();
      }
    });
  }
  waitForUnlock(t2 = 1) {
    if (t2 <= 0) throw new Error(`invalid weight ${t2}: must be positive`);
    return new Promise((r) => {
      this._weightedWaiters[t2 - 1] || (this._weightedWaiters[t2 - 1] = []), this._weightedWaiters[t2 - 1].push(r), this._dispatch();
    });
  }
  isLocked() {
    return this._value <= 0;
  }
  getValue() {
    return this._value;
  }
  setValue(t2) {
    this._value = t2, this._dispatch();
  }
  release(t2 = 1) {
    if (t2 <= 0) throw new Error(`invalid weight ${t2}: must be positive`);
    this._value += t2, this._dispatch();
  }
  cancel() {
    this._weightedQueues.forEach((t2) => t2.forEach((r) => r.reject(this._cancelError))), this._weightedQueues = [];
  }
  _dispatch() {
    var t2;
    for (let r = this._value; r > 0; r--) {
      let a2 = (t2 = this._weightedQueues[r - 1]) === null || t2 === void 0 ? void 0 : t2.shift();
      if (!a2) continue;
      let s4 = this._value, o4 = r;
      this._value -= r, r = this._value + 1, a2.resolve([s4, this._newReleaser(o4)]);
    }
    this._drainUnlockWaiters();
  }
  _newReleaser(t2) {
    let r = false;
    return () => {
      r || (r = true, this.release(t2));
    };
  }
  _drainUnlockWaiters() {
    for (let t2 = this._value; t2 > 0; t2--) this._weightedWaiters[t2 - 1] && (this._weightedWaiters[t2 - 1].forEach((r) => r()), this._weightedWaiters[t2 - 1] = []);
  }
};
var it2 = function(e, t2, r, a2) {
  function s4(o4) {
    return o4 instanceof r ? o4 : new r(function(n3) {
      n3(o4);
    });
  }
  return new (r || (r = Promise))(function(o4, n3) {
    function _3(m4) {
      try {
        p4(a2.next(m4));
      } catch (d2) {
        n3(d2);
      }
    }
    function l3(m4) {
      try {
        p4(a2.throw(m4));
      } catch (d2) {
        n3(d2);
      }
    }
    function p4(m4) {
      m4.done ? o4(m4.value) : s4(m4.value).then(_3, l3);
    }
    p4((a2 = a2.apply(e, t2 || [])).next());
  });
};
var Y2 = class {
  constructor(t2) {
    this._semaphore = new Fe2(1, t2);
  }
  acquire() {
    return it2(this, void 0, void 0, function* () {
      let [, t2] = yield this._semaphore.acquire();
      return t2;
    });
  }
  runExclusive(t2) {
    return this._semaphore.runExclusive(() => t2());
  }
  isLocked() {
    return this._semaphore.isLocked();
  }
  waitForUnlock() {
    return this._semaphore.waitForUnlock();
  }
  release() {
    this._semaphore.isLocked() && this._semaphore.release();
  }
  cancel() {
    return this._semaphore.cancel();
  }
};
u();
var Le2 = L(or(), 1);
async function ke2(e) {
  if (Fe) {
    let t2 = await Promise.resolve().then(() => __toESM(require_fs(), 1)), r = await Promise.resolve().then(() => __toESM(require_zlib(), 1)), { Writable: a2 } = await Promise.resolve().then(() => __toESM(require_stream(), 1)), { pipeline: s4 } = await Promise.resolve().then(() => __toESM(require_promises2(), 1));
    if (!t2.existsSync(e)) throw new Error(`Extension bundle not found: ${e}`);
    let o4 = r.createGunzip(), n3 = [];
    return await s4(t2.createReadStream(e), o4, new a2({ write(_3, l3, p4) {
      n3.push(_3), p4();
    } })), new Blob(n3);
  } else {
    let t2 = await fetch(e.toString());
    if (!t2.ok || !t2.body) return null;
    if (t2.headers.get("Content-Encoding") === "gzip") return t2.blob();
    {
      let r = new DecompressionStream("gzip");
      return new Response(t2.body.pipeThrough(r)).blob();
    }
  }
}
async function Be2(e, t2) {
  for (let r in e.pg_extensions) {
    let a2;
    try {
      a2 = await e.pg_extensions[r];
    } catch (s4) {
      console.error("Failed to fetch extension:", r, s4);
      continue;
    }
    if (a2) {
      let s4 = new Uint8Array(await a2.arrayBuffer());
      _t2(e, r, s4, t2);
    } else console.error("Could not get binary data for extension:", r);
  }
}
function _t2(e, t2, r, a2) {
  Le2.default.untar(r).forEach((o4) => {
    if (!o4.name.startsWith(".")) {
      let n3 = e.WASM_PREFIX + "/" + o4.name;
      if (o4.name.endsWith(".so")) {
        let _3 = (...p4) => {
          a2("pgfs:ext OK", n3, p4);
        }, l3 = (...p4) => {
          a2("pgfs:ext FAIL", n3, p4);
        };
        e.FS.createPreloadedFile(lt2(n3), o4.name.split("/").pop().slice(0, -3), o4.data, true, true, _3, l3, false);
      } else try {
        let _3 = n3.substring(0, n3.lastIndexOf("/"));
        e.FS.analyzePath(_3).exists === false && e.FS.mkdirTree(_3), e.FS.writeFile(n3, o4.data);
      } catch (_3) {
        console.error(`Error writing file ${n3}`, _3);
      }
    }
  });
}
function lt2(e) {
  let t2 = e.lastIndexOf("/");
  return t2 > 0 ? e.slice(0, t2) : e;
}
u();
u();
var ue2 = class extends ur {
  async init(t2, r) {
    return this.pg = t2, { emscriptenOpts: { ...r, preRun: [...r.preRun || [], (s4) => {
      let o4 = s4.FS.filesystems.IDBFS;
      s4.FS.mkdir("/pglite"), s4.FS.mkdir(`/pglite/${this.dataDir}`), s4.FS.mount(o4, {}, `/pglite/${this.dataDir}`), s4.FS.symlink(`/pglite/${this.dataDir}`, C2);
    }] } };
  }
  initialSyncFs() {
    return new Promise((t2, r) => {
      this.pg.Module.FS.syncfs(true, (a2) => {
        a2 ? r(a2) : t2();
      });
    });
  }
  syncToFs(t2) {
    return new Promise((r, a2) => {
      this.pg.Module.FS.syncfs(false, (s4) => {
        s4 ? a2(s4) : r();
      });
    });
  }
  async closeFs() {
    let t2 = this.pg.Module.FS.filesystems.IDBFS.dbs[this.dataDir];
    t2 && t2.close(), this.pg.Module.FS.quit();
  }
};
u();
var ce3 = class extends ur {
  async closeFs() {
    this.pg.Module.FS.quit();
  }
};
function Ge2(e) {
  let t2;
  if (e?.startsWith("file://")) {
    if (e = e.slice(7), !e) throw new Error("Invalid dataDir, must be a valid path");
    t2 = "nodefs";
  } else e?.startsWith("idb://") ? (e = e.slice(6), t2 = "idbfs") : e?.startsWith("opfs-ahp://") ? (e = e.slice(11), t2 = "opfs-ahp") : !e || e?.startsWith("memory://") ? t2 = "memoryfs" : t2 = "nodefs";
  return { dataDir: e, fsType: t2 };
}
async function Ue2(e, t2) {
  let r;
  if (e && t2 === "nodefs") {
    let { NodeFS: a2 } = await Promise.resolve().then(() => (init_nodefs(), nodefs_exports));
    r = new a2(e);
  } else if (e && t2 === "idbfs") r = new ue2(e);
  else if (e && t2 === "opfs-ahp") {
    let { OpfsAhpFS: a2 } = await Promise.resolve().then(() => (init_opfs_ahp(), opfs_ahp_exports));
    r = new a2(e);
  } else r = new ce3();
  return r;
}
u();
u();
var pt2 = (() => {
  var _scriptName = import.meta.url;
  return async function(moduleArg = {}) {
    var moduleRtn, Module = moduleArg, readyPromiseResolve, readyPromiseReject, readyPromise = new Promise((e, t2) => {
      readyPromiseResolve = e, readyPromiseReject = t2;
    }), ENVIRONMENT_IS_WEB = typeof window == "object", ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope < "u", ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string" && process.type != "renderer";
    if (ENVIRONMENT_IS_NODE) {
      let { createRequire: e } = await Promise.resolve().then(() => __toESM(require_module(), 1)), t2 = import.meta.url;
      t2.startsWith("data:") && (t2 = "/");
      var require = e(t2);
    }
    Module.expectedDataFileDownloads ?? (Module.expectedDataFileDownloads = 0), Module.expectedDataFileDownloads++, (() => {
      var e = typeof ENVIRONMENT_IS_PTHREAD < "u" && ENVIRONMENT_IS_PTHREAD, t2 = typeof ENVIRONMENT_IS_WASM_WORKER < "u" && ENVIRONMENT_IS_WASM_WORKER;
      if (e || t2) return;
      var r = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
      function a2(s4) {
        var o4 = "";
        typeof window == "object" ? o4 = window.encodeURIComponent(window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")) + "/") : typeof process > "u" && typeof location < "u" && (o4 = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf("/")) + "/"));
        var n3 = "pglite.data", _3 = "pglite.data", l3 = Module.locateFile ? Module.locateFile(_3, "") : _3, p4 = s4.remote_package_size;
        function m4(c2, w4, x6, S3) {
          if (r) {
            require("fs").readFile(c2, (v3, b3) => {
              v3 ? S3(v3) : x6(b3.buffer);
            });
            return;
          }
          Module.dataFileDownloads ?? (Module.dataFileDownloads = {}), fetch(c2).catch((v3) => Promise.reject(new Error(`Network Error: ${c2}`, { cause: v3 }))).then((v3) => {
            if (!v3.ok) return Promise.reject(new Error(`${v3.status}: ${v3.url}`));
            if (!v3.body && v3.arrayBuffer) return v3.arrayBuffer().then(x6);
            let b3 = v3.body.getReader(), E2 = () => b3.read().then(ee2).catch((N2) => Promise.reject(new Error(`Unexpected error while handling : ${v3.url} ${N2}`, { cause: N2 }))), y4 = [], F4 = v3.headers, R3 = Number(F4.get("Content-Length") ?? w4), U3 = 0, ee2 = ({ done: N2, value: H4 }) => {
              if (N2) {
                let A2 = new Uint8Array(y4.map((T5) => T5.length).reduce((T5, $e2) => T5 + $e2, 0)), D4 = 0;
                for (let T5 of y4) A2.set(T5, D4), D4 += T5.length;
                x6(A2.buffer);
              } else {
                y4.push(H4), U3 += H4.length, Module.dataFileDownloads[c2] = { loaded: U3, total: R3 };
                let A2 = 0, D4 = 0;
                for (let T5 of Object.values(Module.dataFileDownloads)) A2 += T5.loaded, D4 += T5.total;
                return Module.setStatus?.(`Downloading data... (${A2}/${D4})`), E2();
              }
            };
            return Module.setStatus?.("Downloading data..."), E2();
          });
        }
        function d2(c2) {
          console.error("package error:", c2);
        }
        var g5 = null, u2 = Module.getPreloadedPackage ? Module.getPreloadedPackage(l3, p4) : null;
        u2 || m4(l3, p4, (c2) => {
          g5 ? (g5(c2), g5 = null) : u2 = c2;
        }, d2);
        function f3(c2) {
          function w4(E2, y4) {
            if (!E2) throw y4 + new Error().stack;
          }
          c2.FS_createPath("/", "home", true, true), c2.FS_createPath("/home", "web_user", true, true), c2.FS_createPath("/", "tmp", true, true), c2.FS_createPath("/tmp", "pglite", true, true), c2.FS_createPath("/tmp/pglite", "bin", true, true), c2.FS_createPath("/tmp/pglite", "lib", true, true), c2.FS_createPath("/tmp/pglite/lib", "postgresql", true, true), c2.FS_createPath("/tmp/pglite/lib/postgresql", "pgxs", true, true), c2.FS_createPath("/tmp/pglite/lib/postgresql/pgxs", "config", true, true), c2.FS_createPath("/tmp/pglite/lib/postgresql/pgxs", "src", true, true), c2.FS_createPath("/tmp/pglite/lib/postgresql/pgxs/src", "makefiles", true, true), c2.FS_createPath("/tmp/pglite", "share", true, true), c2.FS_createPath("/tmp/pglite/share", "postgresql", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql", "extension", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql", "timezone", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Africa", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "America", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone/America", "Argentina", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone/America", "Indiana", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone/America", "Kentucky", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone/America", "North_Dakota", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Antarctica", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Arctic", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Asia", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Atlantic", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Australia", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Brazil", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Canada", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Chile", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Etc", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Europe", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Indian", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Mexico", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "Pacific", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql/timezone", "US", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql", "timezonesets", true, true), c2.FS_createPath("/tmp/pglite/share/postgresql", "tsearch_data", true, true);
          function x6(E2, y4, F4) {
            this.start = E2, this.end = y4, this.audio = F4;
          }
          x6.prototype = { requests: {}, open: function(E2, y4) {
            this.name = y4, this.requests[y4] = this, c2.addRunDependency(`fp ${this.name}`);
          }, send: function() {
          }, onload: function() {
            var E2 = this.byteArray.subarray(this.start, this.end);
            this.finish(E2);
          }, finish: function(E2) {
            var y4 = this;
            c2.FS_createDataFile(this.name, null, E2, true, true, true), c2.removeRunDependency(`fp ${y4.name}`), this.requests[this.name] = null;
          } };
          for (var S3 = s4.files, v3 = 0; v3 < S3.length; ++v3) new x6(S3[v3].start, S3[v3].end, S3[v3].audio || 0).open("GET", S3[v3].filename);
          function b3(E2) {
            w4(E2, "Loading data file failed."), w4(E2.constructor.name === ArrayBuffer.name, "bad input to processPackageData");
            var y4 = new Uint8Array(E2);
            x6.prototype.byteArray = y4;
            for (var F4 = s4.files, R3 = 0; R3 < F4.length; ++R3) x6.prototype.requests[F4[R3].filename].onload();
            c2.removeRunDependency("datafile_pglite.data");
          }
          c2.addRunDependency("datafile_pglite.data"), c2.preloadResults ?? (c2.preloadResults = {}), c2.preloadResults[n3] = { fromCache: false }, u2 ? (b3(u2), u2 = null) : g5 = b3;
        }
        Module.calledRun ? f3(Module) : (Module.preRun ?? (Module.preRun = [])).push(f3);
      }
      a2({ files: [{ filename: "/home/web_user/.pgpass", start: 0, end: 204 }, { filename: "/tmp/pglite/bin/initdb", start: 204, end: 223 }, { filename: "/tmp/pglite/bin/postgres", start: 223, end: 242 }, { filename: "/tmp/pglite/lib/postgresql/cyrillic_and_mic.so", start: 242, end: 4736 }, { filename: "/tmp/pglite/lib/postgresql/dict_snowball.so", start: 4736, end: 577939 }, { filename: "/tmp/pglite/lib/postgresql/euc2004_sjis2004.so", start: 577939, end: 580012 }, { filename: "/tmp/pglite/lib/postgresql/euc_cn_and_mic.so", start: 580012, end: 580953 }, { filename: "/tmp/pglite/lib/postgresql/euc_jp_and_sjis.so", start: 580953, end: 588213 }, { filename: "/tmp/pglite/lib/postgresql/euc_kr_and_mic.so", start: 588213, end: 589164 }, { filename: "/tmp/pglite/lib/postgresql/euc_tw_and_big5.so", start: 589164, end: 593722 }, { filename: "/tmp/pglite/lib/postgresql/latin2_and_win1250.so", start: 593722, end: 595128 }, { filename: "/tmp/pglite/lib/postgresql/latin_and_mic.so", start: 595128, end: 596149 }, { filename: "/tmp/pglite/lib/postgresql/libpqwalreceiver.so", start: 596149, end: 717020 }, { filename: "/tmp/pglite/lib/postgresql/pgoutput.so", start: 717020, end: 730469 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/config/install-sh", start: 730469, end: 744466 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/config/missing", start: 744466, end: 745814 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/src/Makefile.global", start: 745814, end: 782463 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/src/Makefile.port", start: 782463, end: 783316 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/src/Makefile.shlib", start: 783316, end: 798744 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/src/makefiles/pgxs.mk", start: 798744, end: 814709 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/src/nls-global.mk", start: 814709, end: 821577 }, { filename: "/tmp/pglite/lib/postgresql/plpgsql.so", start: 821577, end: 973244 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_big5.so", start: 973244, end: 1087992 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_cyrillic.so", start: 1087992, end: 1093966 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_euc2004.so", start: 1093966, end: 1298898 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_euc_cn.so", start: 1298898, end: 1374078 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_euc_jp.so", start: 1374078, end: 1525306 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_euc_kr.so", start: 1525306, end: 1628162 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_euc_tw.so", start: 1628162, end: 1827718 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_gb18030.so", start: 1827718, end: 2090095 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_gbk.so", start: 2090095, end: 2236627 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_iso8859.so", start: 2236627, end: 2260202 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_iso8859_1.so", start: 2260202, end: 2261174 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_johab.so", start: 2261174, end: 2422878 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_sjis.so", start: 2422878, end: 2504538 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_sjis2004.so", start: 2504538, end: 2631170 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_uhc.so", start: 2631170, end: 2798442 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_win.so", start: 2798442, end: 2824944 }, { filename: "/tmp/pglite/password", start: 2824944, end: 2824953 }, { filename: "/tmp/pglite/share/postgresql/errcodes.txt", start: 2824953, end: 2858345 }, { filename: "/tmp/pglite/share/postgresql/extension/plpgsql--1.0.sql", start: 2858345, end: 2859003 }, { filename: "/tmp/pglite/share/postgresql/extension/plpgsql.control", start: 2859003, end: 2859196 }, { filename: "/tmp/pglite/share/postgresql/information_schema.sql", start: 2859196, end: 2974719 }, { filename: "/tmp/pglite/share/postgresql/pg_hba.conf.sample", start: 2974719, end: 2980344 }, { filename: "/tmp/pglite/share/postgresql/pg_ident.conf.sample", start: 2980344, end: 2982984 }, { filename: "/tmp/pglite/share/postgresql/pg_service.conf.sample", start: 2982984, end: 2983588 }, { filename: "/tmp/pglite/share/postgresql/postgres.bki", start: 2983588, end: 3936856 }, { filename: "/tmp/pglite/share/postgresql/postgresql.conf.sample", start: 3936856, end: 3967518 }, { filename: "/tmp/pglite/share/postgresql/psqlrc.sample", start: 3967518, end: 3967796 }, { filename: "/tmp/pglite/share/postgresql/snowball_create.sql", start: 3967796, end: 4011972 }, { filename: "/tmp/pglite/share/postgresql/sql_features.txt", start: 4011972, end: 4047705 }, { filename: "/tmp/pglite/share/postgresql/system_constraints.sql", start: 4047705, end: 4056600 }, { filename: "/tmp/pglite/share/postgresql/system_functions.sql", start: 4056600, end: 4080903 }, { filename: "/tmp/pglite/share/postgresql/system_views.sql", start: 4080903, end: 4132597 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Abidjan", start: 4132597, end: 4132745 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Accra", start: 4132745, end: 4132893 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Addis_Ababa", start: 4132893, end: 4133158 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Algiers", start: 4133158, end: 4133893 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Asmara", start: 4133893, end: 4134158 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Asmera", start: 4134158, end: 4134423 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Bamako", start: 4134423, end: 4134571 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Bangui", start: 4134571, end: 4134806 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Banjul", start: 4134806, end: 4134954 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Bissau", start: 4134954, end: 4135148 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Blantyre", start: 4135148, end: 4135297 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Brazzaville", start: 4135297, end: 4135532 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Bujumbura", start: 4135532, end: 4135681 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Cairo", start: 4135681, end: 4138080 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Casablanca", start: 4138080, end: 4140509 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Ceuta", start: 4140509, end: 4142561 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Conakry", start: 4142561, end: 4142709 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Dakar", start: 4142709, end: 4142857 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Dar_es_Salaam", start: 4142857, end: 4143122 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Djibouti", start: 4143122, end: 4143387 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Douala", start: 4143387, end: 4143622 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/El_Aaiun", start: 4143622, end: 4145917 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Freetown", start: 4145917, end: 4146065 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Gaborone", start: 4146065, end: 4146214 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Harare", start: 4146214, end: 4146363 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Johannesburg", start: 4146363, end: 4146609 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Juba", start: 4146609, end: 4147288 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Kampala", start: 4147288, end: 4147553 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Khartoum", start: 4147553, end: 4148232 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Kigali", start: 4148232, end: 4148381 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Kinshasa", start: 4148381, end: 4148616 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Lagos", start: 4148616, end: 4148851 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Libreville", start: 4148851, end: 4149086 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Lome", start: 4149086, end: 4149234 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Luanda", start: 4149234, end: 4149469 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Lubumbashi", start: 4149469, end: 4149618 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Lusaka", start: 4149618, end: 4149767 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Malabo", start: 4149767, end: 4150002 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Maputo", start: 4150002, end: 4150151 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Maseru", start: 4150151, end: 4150397 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Mbabane", start: 4150397, end: 4150643 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Mogadishu", start: 4150643, end: 4150908 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Monrovia", start: 4150908, end: 4151116 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Nairobi", start: 4151116, end: 4151381 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Ndjamena", start: 4151381, end: 4151580 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Niamey", start: 4151580, end: 4151815 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Nouakchott", start: 4151815, end: 4151963 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Ouagadougou", start: 4151963, end: 4152111 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Porto-Novo", start: 4152111, end: 4152346 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Sao_Tome", start: 4152346, end: 4152600 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Timbuktu", start: 4152600, end: 4152748 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Tripoli", start: 4152748, end: 4153373 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Tunis", start: 4153373, end: 4154062 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Windhoek", start: 4154062, end: 4155017 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Adak", start: 4155017, end: 4157373 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Anchorage", start: 4157373, end: 4159744 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Anguilla", start: 4159744, end: 4159990 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Antigua", start: 4159990, end: 4160236 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Araguaina", start: 4160236, end: 4161120 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Buenos_Aires", start: 4161120, end: 4162196 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Catamarca", start: 4162196, end: 4163272 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/ComodRivadavia", start: 4163272, end: 4164348 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Cordoba", start: 4164348, end: 4165424 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Jujuy", start: 4165424, end: 4166472 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/La_Rioja", start: 4166472, end: 4167562 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Mendoza", start: 4167562, end: 4168638 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Rio_Gallegos", start: 4168638, end: 4169714 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Salta", start: 4169714, end: 4170762 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/San_Juan", start: 4170762, end: 4171852 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/San_Luis", start: 4171852, end: 4172954 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Tucuman", start: 4172954, end: 4174058 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Ushuaia", start: 4174058, end: 4175134 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Aruba", start: 4175134, end: 4175380 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Asuncion", start: 4175380, end: 4177038 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Atikokan", start: 4177038, end: 4177220 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Atka", start: 4177220, end: 4179576 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Bahia", start: 4179576, end: 4180600 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Bahia_Banderas", start: 4180600, end: 4181700 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Barbados", start: 4181700, end: 4182136 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Belem", start: 4182136, end: 4182712 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Belize", start: 4182712, end: 4184326 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Blanc-Sablon", start: 4184326, end: 4184572 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Boa_Vista", start: 4184572, end: 4185204 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Bogota", start: 4185204, end: 4185450 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Boise", start: 4185450, end: 4187860 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Buenos_Aires", start: 4187860, end: 4188936 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cambridge_Bay", start: 4188936, end: 4191190 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Campo_Grande", start: 4191190, end: 4192634 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cancun", start: 4192634, end: 4193498 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Caracas", start: 4193498, end: 4193762 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Catamarca", start: 4193762, end: 4194838 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cayenne", start: 4194838, end: 4195036 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cayman", start: 4195036, end: 4195218 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Chicago", start: 4195218, end: 4198810 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Chihuahua", start: 4198810, end: 4199912 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Ciudad_Juarez", start: 4199912, end: 4201450 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Coral_Harbour", start: 4201450, end: 4201632 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cordoba", start: 4201632, end: 4202708 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Costa_Rica", start: 4202708, end: 4203024 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Coyhaique", start: 4203024, end: 4205164 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Creston", start: 4205164, end: 4205524 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cuiaba", start: 4205524, end: 4206940 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Curacao", start: 4206940, end: 4207186 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Danmarkshavn", start: 4207186, end: 4207884 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Dawson", start: 4207884, end: 4209498 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Dawson_Creek", start: 4209498, end: 4210548 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Denver", start: 4210548, end: 4213008 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Detroit", start: 4213008, end: 4215238 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Dominica", start: 4215238, end: 4215484 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Edmonton", start: 4215484, end: 4217816 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Eirunepe", start: 4217816, end: 4218472 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/El_Salvador", start: 4218472, end: 4218696 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Ensenada", start: 4218696, end: 4221154 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Fort_Nelson", start: 4221154, end: 4223394 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Fort_Wayne", start: 4223394, end: 4225076 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Fortaleza", start: 4225076, end: 4225792 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Glace_Bay", start: 4225792, end: 4227984 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Godthab", start: 4227984, end: 4229887 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Goose_Bay", start: 4229887, end: 4233097 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Grand_Turk", start: 4233097, end: 4234931 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Grenada", start: 4234931, end: 4235177 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Guadeloupe", start: 4235177, end: 4235423 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Guatemala", start: 4235423, end: 4235703 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Guayaquil", start: 4235703, end: 4235949 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Guyana", start: 4235949, end: 4236211 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Halifax", start: 4236211, end: 4239635 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Havana", start: 4239635, end: 4242051 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Hermosillo", start: 4242051, end: 4242439 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Indianapolis", start: 4242439, end: 4244121 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Knox", start: 4244121, end: 4246565 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Marengo", start: 4246565, end: 4248303 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Petersburg", start: 4248303, end: 4250223 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Tell_City", start: 4250223, end: 4251923 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Vevay", start: 4251923, end: 4253353 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Vincennes", start: 4253353, end: 4255063 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Winamac", start: 4255063, end: 4256857 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indianapolis", start: 4256857, end: 4258539 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Inuvik", start: 4258539, end: 4260613 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Iqaluit", start: 4260613, end: 4262815 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Jamaica", start: 4262815, end: 4263297 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Jujuy", start: 4263297, end: 4264345 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Juneau", start: 4264345, end: 4266698 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Kentucky/Louisville", start: 4266698, end: 4269486 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Kentucky/Monticello", start: 4269486, end: 4271854 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Knox_IN", start: 4271854, end: 4274298 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Kralendijk", start: 4274298, end: 4274544 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/La_Paz", start: 4274544, end: 4274776 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Lima", start: 4274776, end: 4275182 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Los_Angeles", start: 4275182, end: 4278034 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Louisville", start: 4278034, end: 4280822 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Lower_Princes", start: 4280822, end: 4281068 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Maceio", start: 4281068, end: 4281812 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Managua", start: 4281812, end: 4282242 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Manaus", start: 4282242, end: 4282846 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Marigot", start: 4282846, end: 4283092 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Martinique", start: 4283092, end: 4283324 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Matamoros", start: 4283324, end: 4284742 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Mazatlan", start: 4284742, end: 4285802 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Mendoza", start: 4285802, end: 4286878 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Menominee", start: 4286878, end: 4289152 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Merida", start: 4289152, end: 4290156 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Metlakatla", start: 4290156, end: 4291579 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Mexico_City", start: 4291579, end: 4292801 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Miquelon", start: 4292801, end: 4294467 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Moncton", start: 4294467, end: 4297621 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Monterrey", start: 4297621, end: 4298735 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Montevideo", start: 4298735, end: 4300245 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Montreal", start: 4300245, end: 4303739 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Montserrat", start: 4303739, end: 4303985 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Nassau", start: 4303985, end: 4307479 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/New_York", start: 4307479, end: 4311031 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Nipigon", start: 4311031, end: 4314525 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Nome", start: 4314525, end: 4316892 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Noronha", start: 4316892, end: 4317608 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/North_Dakota/Beulah", start: 4317608, end: 4320004 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/North_Dakota/Center", start: 4320004, end: 4322400 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/North_Dakota/New_Salem", start: 4322400, end: 4324796 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Nuuk", start: 4324796, end: 4326699 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Ojinaga", start: 4326699, end: 4328223 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Panama", start: 4328223, end: 4328405 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Pangnirtung", start: 4328405, end: 4330607 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Paramaribo", start: 4330607, end: 4330869 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Phoenix", start: 4330869, end: 4331229 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Port-au-Prince", start: 4331229, end: 4332663 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Port_of_Spain", start: 4332663, end: 4332909 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Porto_Acre", start: 4332909, end: 4333537 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Porto_Velho", start: 4333537, end: 4334113 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Puerto_Rico", start: 4334113, end: 4334359 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Punta_Arenas", start: 4334359, end: 4336275 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Rainy_River", start: 4336275, end: 4339143 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Rankin_Inlet", start: 4339143, end: 4341209 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Recife", start: 4341209, end: 4341925 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Regina", start: 4341925, end: 4342905 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Resolute", start: 4342905, end: 4344971 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Rio_Branco", start: 4344971, end: 4345599 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Rosario", start: 4345599, end: 4346675 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Santa_Isabel", start: 4346675, end: 4349133 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Santarem", start: 4349133, end: 4349735 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Santiago", start: 4349735, end: 4352264 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Santo_Domingo", start: 4352264, end: 4352722 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Sao_Paulo", start: 4352722, end: 4354166 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Scoresbysund", start: 4354166, end: 4356115 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Shiprock", start: 4356115, end: 4358575 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Sitka", start: 4358575, end: 4360904 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Barthelemy", start: 4360904, end: 4361150 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Johns", start: 4361150, end: 4364805 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Kitts", start: 4364805, end: 4365051 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Lucia", start: 4365051, end: 4365297 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Thomas", start: 4365297, end: 4365543 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Vincent", start: 4365543, end: 4365789 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Swift_Current", start: 4365789, end: 4366349 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Tegucigalpa", start: 4366349, end: 4366601 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Thule", start: 4366601, end: 4368103 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Thunder_Bay", start: 4368103, end: 4371597 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Tijuana", start: 4371597, end: 4374055 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Toronto", start: 4374055, end: 4377549 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Tortola", start: 4377549, end: 4377795 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Vancouver", start: 4377795, end: 4380687 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Virgin", start: 4380687, end: 4380933 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Whitehorse", start: 4380933, end: 4382547 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Winnipeg", start: 4382547, end: 4385415 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Yakutat", start: 4385415, end: 4387720 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Yellowknife", start: 4387720, end: 4390052 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Casey", start: 4390052, end: 4390489 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Davis", start: 4390489, end: 4390786 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/DumontDUrville", start: 4390786, end: 4390972 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Macquarie", start: 4390972, end: 4393232 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Mawson", start: 4393232, end: 4393431 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/McMurdo", start: 4393431, end: 4395868 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Palmer", start: 4395868, end: 4397286 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Rothera", start: 4397286, end: 4397450 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/South_Pole", start: 4397450, end: 4399887 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Syowa", start: 4399887, end: 4400052 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Troll", start: 4400052, end: 4401214 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Vostok", start: 4401214, end: 4401441 }, { filename: "/tmp/pglite/share/postgresql/timezone/Arctic/Longyearbyen", start: 4401441, end: 4403739 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Aden", start: 4403739, end: 4403904 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Almaty", start: 4403904, end: 4404901 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Amman", start: 4404901, end: 4406348 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Anadyr", start: 4406348, end: 4407536 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Aqtau", start: 4407536, end: 4408519 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Aqtobe", start: 4408519, end: 4409530 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ashgabat", start: 4409530, end: 4410149 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ashkhabad", start: 4410149, end: 4410768 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Atyrau", start: 4410768, end: 4411759 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Baghdad", start: 4411759, end: 4412742 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Bahrain", start: 4412742, end: 4412941 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Baku", start: 4412941, end: 4414168 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Bangkok", start: 4414168, end: 4414367 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Barnaul", start: 4414367, end: 4415588 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Beirut", start: 4415588, end: 4417742 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Bishkek", start: 4417742, end: 4418725 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Brunei", start: 4418725, end: 4419208 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Calcutta", start: 4419208, end: 4419493 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Chita", start: 4419493, end: 4420714 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Choibalsan", start: 4420714, end: 4421605 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Chongqing", start: 4421605, end: 4422166 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Chungking", start: 4422166, end: 4422727 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Colombo", start: 4422727, end: 4423099 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Dacca", start: 4423099, end: 4423436 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Damascus", start: 4423436, end: 4425323 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Dhaka", start: 4425323, end: 4425660 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Dili", start: 4425660, end: 4425931 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Dubai", start: 4425931, end: 4426096 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Dushanbe", start: 4426096, end: 4426687 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Famagusta", start: 4426687, end: 4428715 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Gaza", start: 4428715, end: 4432559 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Harbin", start: 4432559, end: 4433120 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Hebron", start: 4433120, end: 4436992 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ho_Chi_Minh", start: 4436992, end: 4437343 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Hong_Kong", start: 4437343, end: 4438576 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Hovd", start: 4438576, end: 4439467 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Irkutsk", start: 4439467, end: 4440710 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Istanbul", start: 4440710, end: 4442657 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Jakarta", start: 4442657, end: 4443040 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Jayapura", start: 4443040, end: 4443261 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Jerusalem", start: 4443261, end: 4445649 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kabul", start: 4445649, end: 4445857 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kamchatka", start: 4445857, end: 4447023 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Karachi", start: 4447023, end: 4447402 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kashgar", start: 4447402, end: 4447567 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kathmandu", start: 4447567, end: 4447779 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Katmandu", start: 4447779, end: 4447991 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Khandyga", start: 4447991, end: 4449262 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kolkata", start: 4449262, end: 4449547 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Krasnoyarsk", start: 4449547, end: 4450754 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kuala_Lumpur", start: 4450754, end: 4451169 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kuching", start: 4451169, end: 4451652 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kuwait", start: 4451652, end: 4451817 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Macao", start: 4451817, end: 4453044 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Macau", start: 4453044, end: 4454271 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Magadan", start: 4454271, end: 4455493 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Makassar", start: 4455493, end: 4455747 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Manila", start: 4455747, end: 4456169 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Muscat", start: 4456169, end: 4456334 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Nicosia", start: 4456334, end: 4458336 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Novokuznetsk", start: 4458336, end: 4459501 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Novosibirsk", start: 4459501, end: 4460722 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Omsk", start: 4460722, end: 4461929 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Oral", start: 4461929, end: 4462934 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Phnom_Penh", start: 4462934, end: 4463133 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Pontianak", start: 4463133, end: 4463486 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Pyongyang", start: 4463486, end: 4463723 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Qatar", start: 4463723, end: 4463922 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Qostanay", start: 4463922, end: 4464961 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Qyzylorda", start: 4464961, end: 4465986 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Rangoon", start: 4465986, end: 4466254 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Riyadh", start: 4466254, end: 4466419 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Saigon", start: 4466419, end: 4466770 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Sakhalin", start: 4466770, end: 4467972 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Samarkand", start: 4467972, end: 4468549 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Seoul", start: 4468549, end: 4469166 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Shanghai", start: 4469166, end: 4469727 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Singapore", start: 4469727, end: 4470142 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Srednekolymsk", start: 4470142, end: 4471350 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Taipei", start: 4471350, end: 4472111 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tashkent", start: 4472111, end: 4472702 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tbilisi", start: 4472702, end: 4473737 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tehran", start: 4473737, end: 4474999 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tel_Aviv", start: 4474999, end: 4477387 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Thimbu", start: 4477387, end: 4477590 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Thimphu", start: 4477590, end: 4477793 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tokyo", start: 4477793, end: 4478102 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tomsk", start: 4478102, end: 4479323 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ujung_Pandang", start: 4479323, end: 4479577 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ulaanbaatar", start: 4479577, end: 4480468 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ulan_Bator", start: 4480468, end: 4481359 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Urumqi", start: 4481359, end: 4481524 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ust-Nera", start: 4481524, end: 4482776 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Vientiane", start: 4482776, end: 4482975 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Vladivostok", start: 4482975, end: 4484183 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Yakutsk", start: 4484183, end: 4485390 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Yangon", start: 4485390, end: 4485658 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Yekaterinburg", start: 4485658, end: 4486901 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Yerevan", start: 4486901, end: 4488052 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Azores", start: 4488052, end: 4491508 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Bermuda", start: 4491508, end: 4493904 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Canary", start: 4493904, end: 4495801 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Cape_Verde", start: 4495801, end: 4496071 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Faeroe", start: 4496071, end: 4497886 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Faroe", start: 4497886, end: 4499701 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Jan_Mayen", start: 4499701, end: 4501999 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Madeira", start: 4501999, end: 4505376 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Reykjavik", start: 4505376, end: 4505524 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/South_Georgia", start: 4505524, end: 4505688 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/St_Helena", start: 4505688, end: 4505836 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Stanley", start: 4505836, end: 4507050 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/ACT", start: 4507050, end: 4509240 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Adelaide", start: 4509240, end: 4511448 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Brisbane", start: 4511448, end: 4511867 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Broken_Hill", start: 4511867, end: 4514096 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Canberra", start: 4514096, end: 4516286 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Currie", start: 4516286, end: 4518644 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Darwin", start: 4518644, end: 4518969 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Eucla", start: 4518969, end: 4519439 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Hobart", start: 4519439, end: 4521797 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/LHI", start: 4521797, end: 4523657 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Lindeman", start: 4523657, end: 4524132 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Lord_Howe", start: 4524132, end: 4525992 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Melbourne", start: 4525992, end: 4528182 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/NSW", start: 4528182, end: 4530372 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/North", start: 4530372, end: 4530697 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Perth", start: 4530697, end: 4531143 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Queensland", start: 4531143, end: 4531562 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/South", start: 4531562, end: 4533770 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Sydney", start: 4533770, end: 4535960 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Tasmania", start: 4535960, end: 4538318 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Victoria", start: 4538318, end: 4540508 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/West", start: 4540508, end: 4540954 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Yancowinna", start: 4540954, end: 4543183 }, { filename: "/tmp/pglite/share/postgresql/timezone/Brazil/Acre", start: 4543183, end: 4543811 }, { filename: "/tmp/pglite/share/postgresql/timezone/Brazil/DeNoronha", start: 4543811, end: 4544527 }, { filename: "/tmp/pglite/share/postgresql/timezone/Brazil/East", start: 4544527, end: 4545971 }, { filename: "/tmp/pglite/share/postgresql/timezone/Brazil/West", start: 4545971, end: 4546575 }, { filename: "/tmp/pglite/share/postgresql/timezone/CET", start: 4546575, end: 4549508 }, { filename: "/tmp/pglite/share/postgresql/timezone/CST6CDT", start: 4549508, end: 4553100 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Atlantic", start: 4553100, end: 4556524 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Central", start: 4556524, end: 4559392 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Eastern", start: 4559392, end: 4562886 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Mountain", start: 4562886, end: 4565218 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Newfoundland", start: 4565218, end: 4568873 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Pacific", start: 4568873, end: 4571765 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Saskatchewan", start: 4571765, end: 4572745 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Yukon", start: 4572745, end: 4574359 }, { filename: "/tmp/pglite/share/postgresql/timezone/Chile/Continental", start: 4574359, end: 4576888 }, { filename: "/tmp/pglite/share/postgresql/timezone/Chile/EasterIsland", start: 4576888, end: 4579121 }, { filename: "/tmp/pglite/share/postgresql/timezone/Cuba", start: 4579121, end: 4581537 }, { filename: "/tmp/pglite/share/postgresql/timezone/EET", start: 4581537, end: 4583799 }, { filename: "/tmp/pglite/share/postgresql/timezone/EST", start: 4583799, end: 4583981 }, { filename: "/tmp/pglite/share/postgresql/timezone/EST5EDT", start: 4583981, end: 4587533 }, { filename: "/tmp/pglite/share/postgresql/timezone/Egypt", start: 4587533, end: 4589932 }, { filename: "/tmp/pglite/share/postgresql/timezone/Eire", start: 4589932, end: 4593424 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT", start: 4593424, end: 4593538 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+0", start: 4593538, end: 4593652 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+1", start: 4593652, end: 4593768 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+10", start: 4593768, end: 4593885 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+11", start: 4593885, end: 4594002 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+12", start: 4594002, end: 4594119 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+2", start: 4594119, end: 4594235 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+3", start: 4594235, end: 4594351 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+4", start: 4594351, end: 4594467 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+5", start: 4594467, end: 4594583 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+6", start: 4594583, end: 4594699 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+7", start: 4594699, end: 4594815 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+8", start: 4594815, end: 4594931 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+9", start: 4594931, end: 4595047 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-0", start: 4595047, end: 4595161 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-1", start: 4595161, end: 4595278 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-10", start: 4595278, end: 4595396 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-11", start: 4595396, end: 4595514 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-12", start: 4595514, end: 4595632 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-13", start: 4595632, end: 4595750 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-14", start: 4595750, end: 4595868 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-2", start: 4595868, end: 4595985 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-3", start: 4595985, end: 4596102 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-4", start: 4596102, end: 4596219 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-5", start: 4596219, end: 4596336 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-6", start: 4596336, end: 4596453 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-7", start: 4596453, end: 4596570 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-8", start: 4596570, end: 4596687 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-9", start: 4596687, end: 4596804 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT0", start: 4596804, end: 4596918 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/Greenwich", start: 4596918, end: 4597032 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/UCT", start: 4597032, end: 4597146 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/UTC", start: 4597146, end: 4597260 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/Universal", start: 4597260, end: 4597374 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/Zulu", start: 4597374, end: 4597488 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Amsterdam", start: 4597488, end: 4600421 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Andorra", start: 4600421, end: 4602163 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Astrakhan", start: 4602163, end: 4603328 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Athens", start: 4603328, end: 4605590 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Belfast", start: 4605590, end: 4609254 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Belgrade", start: 4609254, end: 4611174 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Berlin", start: 4611174, end: 4613472 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Bratislava", start: 4613472, end: 4615773 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Brussels", start: 4615773, end: 4618706 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Bucharest", start: 4618706, end: 4620890 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Budapest", start: 4620890, end: 4623258 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Busingen", start: 4623258, end: 4625167 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Chisinau", start: 4625167, end: 4627557 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Copenhagen", start: 4627557, end: 4629855 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Dublin", start: 4629855, end: 4633347 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Gibraltar", start: 4633347, end: 4636415 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Guernsey", start: 4636415, end: 4640079 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Helsinki", start: 4640079, end: 4641979 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Isle_of_Man", start: 4641979, end: 4645643 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Istanbul", start: 4645643, end: 4647590 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Jersey", start: 4647590, end: 4651254 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Kaliningrad", start: 4651254, end: 4652747 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Kiev", start: 4652747, end: 4654867 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Kirov", start: 4654867, end: 4656052 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Kyiv", start: 4656052, end: 4658172 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Lisbon", start: 4658172, end: 4661699 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Ljubljana", start: 4661699, end: 4663619 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/London", start: 4663619, end: 4667283 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Luxembourg", start: 4667283, end: 4670216 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Madrid", start: 4670216, end: 4672830 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Malta", start: 4672830, end: 4675450 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Mariehamn", start: 4675450, end: 4677350 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Minsk", start: 4677350, end: 4678671 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Monaco", start: 4678671, end: 4681633 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Moscow", start: 4681633, end: 4683168 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Nicosia", start: 4683168, end: 4685170 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Oslo", start: 4685170, end: 4687468 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Paris", start: 4687468, end: 4690430 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Podgorica", start: 4690430, end: 4692350 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Prague", start: 4692350, end: 4694651 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Riga", start: 4694651, end: 4696849 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Rome", start: 4696849, end: 4699490 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Samara", start: 4699490, end: 4700705 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/San_Marino", start: 4700705, end: 4703346 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Sarajevo", start: 4703346, end: 4705266 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Saratov", start: 4705266, end: 4706449 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Simferopol", start: 4706449, end: 4707918 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Skopje", start: 4707918, end: 4709838 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Sofia", start: 4709838, end: 4711915 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Stockholm", start: 4711915, end: 4714213 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Tallinn", start: 4714213, end: 4716361 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Tirane", start: 4716361, end: 4718445 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Tiraspol", start: 4718445, end: 4720835 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Ulyanovsk", start: 4720835, end: 4722102 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Uzhgorod", start: 4722102, end: 4724222 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Vaduz", start: 4724222, end: 4726131 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Vatican", start: 4726131, end: 4728772 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Vienna", start: 4728772, end: 4730972 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Vilnius", start: 4730972, end: 4733134 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Volgograd", start: 4733134, end: 4734327 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Warsaw", start: 4734327, end: 4736981 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Zagreb", start: 4736981, end: 4738901 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Zaporozhye", start: 4738901, end: 4741021 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Zurich", start: 4741021, end: 4742930 }, { filename: "/tmp/pglite/share/postgresql/timezone/Factory", start: 4742930, end: 4743046 }, { filename: "/tmp/pglite/share/postgresql/timezone/GB", start: 4743046, end: 4746710 }, { filename: "/tmp/pglite/share/postgresql/timezone/GB-Eire", start: 4746710, end: 4750374 }, { filename: "/tmp/pglite/share/postgresql/timezone/GMT", start: 4750374, end: 4750488 }, { filename: "/tmp/pglite/share/postgresql/timezone/GMT+0", start: 4750488, end: 4750602 }, { filename: "/tmp/pglite/share/postgresql/timezone/GMT-0", start: 4750602, end: 4750716 }, { filename: "/tmp/pglite/share/postgresql/timezone/GMT0", start: 4750716, end: 4750830 }, { filename: "/tmp/pglite/share/postgresql/timezone/Greenwich", start: 4750830, end: 4750944 }, { filename: "/tmp/pglite/share/postgresql/timezone/HST", start: 4750944, end: 4751273 }, { filename: "/tmp/pglite/share/postgresql/timezone/Hongkong", start: 4751273, end: 4752506 }, { filename: "/tmp/pglite/share/postgresql/timezone/Iceland", start: 4752506, end: 4752654 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Antananarivo", start: 4752654, end: 4752919 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Chagos", start: 4752919, end: 4753118 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Christmas", start: 4753118, end: 4753317 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Cocos", start: 4753317, end: 4753585 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Comoro", start: 4753585, end: 4753850 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Kerguelen", start: 4753850, end: 4754049 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Mahe", start: 4754049, end: 4754214 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Maldives", start: 4754214, end: 4754413 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Mauritius", start: 4754413, end: 4754654 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Mayotte", start: 4754654, end: 4754919 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Reunion", start: 4754919, end: 4755084 }, { filename: "/tmp/pglite/share/postgresql/timezone/Iran", start: 4755084, end: 4756346 }, { filename: "/tmp/pglite/share/postgresql/timezone/Israel", start: 4756346, end: 4758734 }, { filename: "/tmp/pglite/share/postgresql/timezone/Jamaica", start: 4758734, end: 4759216 }, { filename: "/tmp/pglite/share/postgresql/timezone/Japan", start: 4759216, end: 4759525 }, { filename: "/tmp/pglite/share/postgresql/timezone/Kwajalein", start: 4759525, end: 4759841 }, { filename: "/tmp/pglite/share/postgresql/timezone/Libya", start: 4759841, end: 4760466 }, { filename: "/tmp/pglite/share/postgresql/timezone/MET", start: 4760466, end: 4763399 }, { filename: "/tmp/pglite/share/postgresql/timezone/MST", start: 4763399, end: 4763759 }, { filename: "/tmp/pglite/share/postgresql/timezone/MST7MDT", start: 4763759, end: 4766219 }, { filename: "/tmp/pglite/share/postgresql/timezone/Mexico/BajaNorte", start: 4766219, end: 4768677 }, { filename: "/tmp/pglite/share/postgresql/timezone/Mexico/BajaSur", start: 4768677, end: 4769737 }, { filename: "/tmp/pglite/share/postgresql/timezone/Mexico/General", start: 4769737, end: 4770959 }, { filename: "/tmp/pglite/share/postgresql/timezone/NZ", start: 4770959, end: 4773396 }, { filename: "/tmp/pglite/share/postgresql/timezone/NZ-CHAT", start: 4773396, end: 4775464 }, { filename: "/tmp/pglite/share/postgresql/timezone/Navajo", start: 4775464, end: 4777924 }, { filename: "/tmp/pglite/share/postgresql/timezone/PRC", start: 4777924, end: 4778485 }, { filename: "/tmp/pglite/share/postgresql/timezone/PST8PDT", start: 4778485, end: 4781337 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Apia", start: 4781337, end: 4781949 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Auckland", start: 4781949, end: 4784386 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Bougainville", start: 4784386, end: 4784654 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Chatham", start: 4784654, end: 4786722 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Chuuk", start: 4786722, end: 4786908 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Easter", start: 4786908, end: 4789141 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Efate", start: 4789141, end: 4789679 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Enderbury", start: 4789679, end: 4789913 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Fakaofo", start: 4789913, end: 4790113 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Fiji", start: 4790113, end: 4790691 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Funafuti", start: 4790691, end: 4790857 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Galapagos", start: 4790857, end: 4791095 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Gambier", start: 4791095, end: 4791259 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Guadalcanal", start: 4791259, end: 4791425 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Guam", start: 4791425, end: 4791919 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Honolulu", start: 4791919, end: 4792248 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Johnston", start: 4792248, end: 4792577 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Kanton", start: 4792577, end: 4792811 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Kiritimati", start: 4792811, end: 4793049 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Kosrae", start: 4793049, end: 4793400 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Kwajalein", start: 4793400, end: 4793716 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Majuro", start: 4793716, end: 4793882 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Marquesas", start: 4793882, end: 4794055 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Midway", start: 4794055, end: 4794230 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Nauru", start: 4794230, end: 4794482 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Niue", start: 4794482, end: 4794685 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Norfolk", start: 4794685, end: 4795565 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Noumea", start: 4795565, end: 4795869 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Pago_Pago", start: 4795869, end: 4796044 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Palau", start: 4796044, end: 4796224 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Pitcairn", start: 4796224, end: 4796426 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Pohnpei", start: 4796426, end: 4796592 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Ponape", start: 4796592, end: 4796758 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Port_Moresby", start: 4796758, end: 4796944 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Rarotonga", start: 4796944, end: 4797547 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Saipan", start: 4797547, end: 4798041 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Samoa", start: 4798041, end: 4798216 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Tahiti", start: 4798216, end: 4798381 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Tarawa", start: 4798381, end: 4798547 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Tongatapu", start: 4798547, end: 4798919 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Truk", start: 4798919, end: 4799105 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Wake", start: 4799105, end: 4799271 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Wallis", start: 4799271, end: 4799437 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Yap", start: 4799437, end: 4799623 }, { filename: "/tmp/pglite/share/postgresql/timezone/Poland", start: 4799623, end: 4802277 }, { filename: "/tmp/pglite/share/postgresql/timezone/Portugal", start: 4802277, end: 4805804 }, { filename: "/tmp/pglite/share/postgresql/timezone/ROC", start: 4805804, end: 4806565 }, { filename: "/tmp/pglite/share/postgresql/timezone/ROK", start: 4806565, end: 4807182 }, { filename: "/tmp/pglite/share/postgresql/timezone/Singapore", start: 4807182, end: 4807597 }, { filename: "/tmp/pglite/share/postgresql/timezone/Turkey", start: 4807597, end: 4809544 }, { filename: "/tmp/pglite/share/postgresql/timezone/UCT", start: 4809544, end: 4809658 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Alaska", start: 4809658, end: 4812029 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Aleutian", start: 4812029, end: 4814385 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Arizona", start: 4814385, end: 4814745 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Central", start: 4814745, end: 4818337 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/East-Indiana", start: 4818337, end: 4820019 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Eastern", start: 4820019, end: 4823571 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Hawaii", start: 4823571, end: 4823900 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Indiana-Starke", start: 4823900, end: 4826344 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Michigan", start: 4826344, end: 4828574 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Mountain", start: 4828574, end: 4831034 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Pacific", start: 4831034, end: 4833886 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Samoa", start: 4833886, end: 4834061 }, { filename: "/tmp/pglite/share/postgresql/timezone/UTC", start: 4834061, end: 4834175 }, { filename: "/tmp/pglite/share/postgresql/timezone/Universal", start: 4834175, end: 4834289 }, { filename: "/tmp/pglite/share/postgresql/timezone/W-SU", start: 4834289, end: 4835824 }, { filename: "/tmp/pglite/share/postgresql/timezone/WET", start: 4835824, end: 4839351 }, { filename: "/tmp/pglite/share/postgresql/timezone/Zulu", start: 4839351, end: 4839465 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Africa.txt", start: 4839465, end: 4846438 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/America.txt", start: 4846438, end: 4857445 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Antarctica.txt", start: 4857445, end: 4858579 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Asia.txt", start: 4858579, end: 4866890 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Atlantic.txt", start: 4866890, end: 4870423 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Australia", start: 4870423, end: 4871558 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Australia.txt", start: 4871558, end: 4874942 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Default", start: 4874942, end: 4902156 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Etc.txt", start: 4902156, end: 4903406 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Europe.txt", start: 4903406, end: 4912152 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/India", start: 4912152, end: 4912745 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Indian.txt", start: 4912745, end: 4914006 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Pacific.txt", start: 4914006, end: 4917774 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/danish.stop", start: 4917774, end: 4918198 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/dutch.stop", start: 4918198, end: 4918651 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/english.stop", start: 4918651, end: 4919273 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/finnish.stop", start: 4919273, end: 4920852 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/french.stop", start: 4920852, end: 4921657 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/german.stop", start: 4921657, end: 4923006 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hungarian.stop", start: 4923006, end: 4924233 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hunspell_sample.affix", start: 4924233, end: 4924476 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hunspell_sample_long.affix", start: 4924476, end: 4925109 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hunspell_sample_long.dict", start: 4925109, end: 4925207 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hunspell_sample_num.affix", start: 4925207, end: 4925669 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hunspell_sample_num.dict", start: 4925669, end: 4925798 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/ispell_sample.affix", start: 4925798, end: 4926263 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/ispell_sample.dict", start: 4926263, end: 4926344 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/italian.stop", start: 4926344, end: 4927998 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/nepali.stop", start: 4927998, end: 4932259 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/norwegian.stop", start: 4932259, end: 4933110 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/portuguese.stop", start: 4933110, end: 4934377 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/russian.stop", start: 4934377, end: 4935612 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/spanish.stop", start: 4935612, end: 4937790 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/swedish.stop", start: 4937790, end: 4938349 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/synonym_sample.syn", start: 4938349, end: 4938422 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/thesaurus_sample.ths", start: 4938422, end: 4938895 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/turkish.stop", start: 4938895, end: 4939155 }], remote_package_size: 4939155 });
    })();
    var moduleOverrides = Object.assign({}, Module), arguments_ = [], thisProgram = "./this.program", quit_ = (e, t2) => {
      throw t2;
    }, scriptDirectory = "";
    function locateFile(e) {
      return Module.locateFile ? Module.locateFile(e, scriptDirectory) : scriptDirectory + e;
    }
    var readAsync, readBinary;
    if (ENVIRONMENT_IS_NODE) {
      var fs = require("fs"), nodePath = require("path");
      import.meta.url.startsWith("data:") || (scriptDirectory = nodePath.dirname(require("url").fileURLToPath(import.meta.url)) + "/"), readBinary = (e) => {
        e = isFileURI(e) ? new URL(e) : e;
        var t2 = fs.readFileSync(e);
        return t2;
      }, readAsync = async (e, t2 = true) => {
        e = isFileURI(e) ? new URL(e) : e;
        var r = fs.readFileSync(e, t2 ? void 0 : "utf8");
        return r;
      }, !Module.thisProgram && process.argv.length > 1 && (thisProgram = process.argv[1].replace(/\\/g, "/")), arguments_ = process.argv.slice(2), quit_ = (e, t2) => {
        throw process.exitCode = e, t2;
      };
    } else (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && (ENVIRONMENT_IS_WORKER ? scriptDirectory = self.location.href : typeof document < "u" && document.currentScript && (scriptDirectory = document.currentScript.src), _scriptName && (scriptDirectory = _scriptName), scriptDirectory.startsWith("blob:") ? scriptDirectory = "" : scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1), ENVIRONMENT_IS_WORKER && (readBinary = (e) => {
      var t2 = new XMLHttpRequest();
      return t2.open("GET", e, false), t2.responseType = "arraybuffer", t2.send(null), new Uint8Array(t2.response);
    }), readAsync = async (e) => {
      var t2 = await fetch(e, { credentials: "same-origin" });
      if (t2.ok) return t2.arrayBuffer();
      throw new Error(t2.status + " : " + t2.url);
    });
    var out = Module.print || console.log.bind(console), err = Module.printErr || console.error.bind(console);
    Object.assign(Module, moduleOverrides), moduleOverrides = null, Module.arguments && (arguments_ = Module.arguments), Module.thisProgram && (thisProgram = Module.thisProgram);
    var dynamicLibraries = Module.dynamicLibraries || [], wasmBinary = Module.wasmBinary;
    function intArrayFromBase64(e) {
      if (typeof ENVIRONMENT_IS_NODE < "u" && ENVIRONMENT_IS_NODE) {
        var t2 = Buffer.from(e, "base64");
        return new Uint8Array(t2.buffer, t2.byteOffset, t2.length);
      }
      for (var r = atob(e), a2 = new Uint8Array(r.length), s4 = 0; s4 < r.length; ++s4) a2[s4] = r.charCodeAt(s4);
      return a2;
    }
    var wasmMemory, ABORT = false, EXITSTATUS;
    function assert(e, t2) {
      e || abort(t2);
    }
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAP64, HEAPU64, HEAPF64;
    function updateMemoryViews() {
      var e = wasmMemory.buffer;
      Module.HEAP8 = HEAP8 = new Int8Array(e), Module.HEAP16 = HEAP16 = new Int16Array(e), Module.HEAPU8 = HEAPU8 = new Uint8Array(e), Module.HEAPU16 = HEAPU16 = new Uint16Array(e), Module.HEAP32 = HEAP32 = new Int32Array(e), Module.HEAPU32 = HEAPU32 = new Uint32Array(e), Module.HEAPF32 = HEAPF32 = new Float32Array(e), Module.HEAPF64 = HEAPF64 = new Float64Array(e), Module.HEAP64 = HEAP64 = new BigInt64Array(e), Module.HEAPU64 = HEAPU64 = new BigUint64Array(e);
    }
    if (Module.wasmMemory) wasmMemory = Module.wasmMemory;
    else {
      var INITIAL_MEMORY = Module.INITIAL_MEMORY || 16777216;
      wasmMemory = new WebAssembly.Memory({ initial: INITIAL_MEMORY / 65536, maximum: 32768 });
    }
    updateMemoryViews();
    var __ATPRERUN__ = [], __ATINIT__ = [], __ATMAIN__ = [], __ATPOSTRUN__ = [], __RELOC_FUNCS__ = [], runtimeInitialized = false;
    function preRun() {
      if (Module.preRun) for (typeof Module.preRun == "function" && (Module.preRun = [Module.preRun]); Module.preRun.length; ) addOnPreRun(Module.preRun.shift());
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      runtimeInitialized = true, callRuntimeCallbacks(__RELOC_FUNCS__), !Module.noFSInit && !FS.initialized && FS.init(), FS.ignorePermissions = false, TTY.init(), SOCKFS.root = FS.mount(SOCKFS, {}, null), PIPEFS.root = FS.mount(PIPEFS, {}, null), callRuntimeCallbacks(__ATINIT__);
    }
    function preMain() {
      callRuntimeCallbacks(__ATMAIN__);
    }
    function postRun() {
      if (Module.postRun) for (typeof Module.postRun == "function" && (Module.postRun = [Module.postRun]); Module.postRun.length; ) addOnPostRun(Module.postRun.shift());
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(e) {
      __ATPRERUN__.unshift(e);
    }
    function addOnInit(e) {
      __ATINIT__.unshift(e);
    }
    function addOnPostRun(e) {
      __ATPOSTRUN__.unshift(e);
    }
    var runDependencies = 0, dependenciesFulfilled = null;
    function getUniqueRunDependency(e) {
      return e;
    }
    function addRunDependency(e) {
      runDependencies++, Module.monitorRunDependencies?.(runDependencies);
    }
    function removeRunDependency(e) {
      if (runDependencies--, Module.monitorRunDependencies?.(runDependencies), runDependencies == 0 && dependenciesFulfilled) {
        var t2 = dependenciesFulfilled;
        dependenciesFulfilled = null, t2();
      }
    }
    function abort(e) {
      Module.onAbort?.(e), e = "Aborted(" + e + ")", err(e), ABORT = true, e += ". Build with -sASSERTIONS for more info.";
      var t2 = new WebAssembly.RuntimeError(e);
      throw readyPromiseReject(t2), t2;
    }
    var dataURIPrefix = "data:application/octet-stream;base64,", isDataURI = (e) => e.startsWith(dataURIPrefix), isFileURI = (e) => e.startsWith("file://");
    function findWasmBinary() {
      if (Module.locateFile) {
        var e = "pglite.wasm";
        return isDataURI(e) ? e : locateFile(e);
      }
      return new URL("pglite.wasm", import.meta.url).href;
    }
    var wasmBinaryFile;
    function getBinarySync(e) {
      if (e == wasmBinaryFile && wasmBinary) return new Uint8Array(wasmBinary);
      if (readBinary) return readBinary(e);
      throw "both async and sync fetching of the wasm failed";
    }
    async function getWasmBinary(e) {
      if (!wasmBinary) try {
        var t2 = await readAsync(e);
        return new Uint8Array(t2);
      } catch {
      }
      return getBinarySync(e);
    }
    async function instantiateArrayBuffer(e, t2) {
      try {
        var r = await getWasmBinary(e), a2 = await WebAssembly.instantiate(r, t2);
        return a2;
      } catch (s4) {
        err(`failed to asynchronously prepare wasm: ${s4}`), abort(s4);
      }
    }
    async function instantiateAsync(e, t2, r) {
      if (!e && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(t2) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") try {
        var a2 = fetch(t2, { credentials: "same-origin" }), s4 = await WebAssembly.instantiateStreaming(a2, r);
        return s4;
      } catch (o4) {
        err(`wasm streaming compile failed: ${o4}`), err("falling back to ArrayBuffer instantiation");
      }
      return instantiateArrayBuffer(t2, r);
    }
    function getWasmImports() {
      return { env: wasmImports, wasi_snapshot_preview1: wasmImports, "GOT.mem": new Proxy(wasmImports, GOTHandler), "GOT.func": new Proxy(wasmImports, GOTHandler) };
    }
    async function createWasm() {
      function e(s4, o4) {
        wasmExports = s4.exports, wasmExports = relocateExports(wasmExports, 1024);
        var n3 = getDylinkMetadata(o4);
        return n3.neededDynlibs && (dynamicLibraries = n3.neededDynlibs.concat(dynamicLibraries)), mergeLibSymbols(wasmExports, "main"), LDSO.init(), loadDylibs(), addOnInit(wasmExports.__wasm_call_ctors), __RELOC_FUNCS__.push(wasmExports.__wasm_apply_data_relocs), removeRunDependency("wasm-instantiate"), wasmExports;
      }
      addRunDependency("wasm-instantiate");
      function t2(s4) {
        e(s4.instance, s4.module);
      }
      var r = getWasmImports();
      if (Module.instantiateWasm) try {
        return Module.instantiateWasm(r, e);
      } catch (s4) {
        err(`Module.instantiateWasm callback failed with error: ${s4}`), readyPromiseReject(s4);
      }
      wasmBinaryFile ?? (wasmBinaryFile = findWasmBinary());
      try {
        var a2 = await instantiateAsync(wasmBinary, wasmBinaryFile, r);
        return t2(a2), a2;
      } catch (s4) {
        readyPromiseReject(s4);
        return;
      }
    }
    var ASM_CONSTS = { 2537480: (e) => {
      Module.is_worker = typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope, Module.FD_BUFFER_MAX = e, Module.emscripten_copy_to = console.warn;
    }, 2537652: () => {
      Module.postMessage = function(t2) {
        console.log("# pg_main_emsdk.c:544: onCustomMessage:", t2);
      };
    }, 2537781: () => {
      if (Module.is_worker) {
        let t2 = function(r) {
          console.log("onCustomMessage:", r);
        };
        var e = t2;
        Module.onCustomMessage = t2;
      } else Module.postMessage = function(r) {
        switch (r.type) {
          case "raw":
            break;
          case "stdin": {
            stringToUTF8(r.data, 1, Module.FD_BUFFER_MAX);
            break;
          }
          case "rcon":
            break;
          default:
            console.warn("custom_postMessage?", r);
        }
      };
    } };
    class ExitStatus {
      constructor(t2) {
        P(this, "name", "ExitStatus");
        this.message = `Program terminated with exit(${t2})`, this.status = t2;
      }
    }
    var GOT = {}, currentModuleWeakSymbols = /* @__PURE__ */ new Set([]), GOTHandler = { get(e, t2) {
      var r = GOT[t2];
      return r || (r = GOT[t2] = new WebAssembly.Global({ value: "i32", mutable: true })), currentModuleWeakSymbols.has(t2) || (r.required = true), r;
    } }, callRuntimeCallbacks = (e) => {
      for (; e.length > 0; ) e.shift()(Module);
    }, UTF8Decoder = typeof TextDecoder < "u" ? new TextDecoder() : void 0, UTF8ArrayToString = (e, t2 = 0, r = NaN) => {
      for (var a2 = t2 + r, s4 = t2; e[s4] && !(s4 >= a2); ) ++s4;
      if (s4 - t2 > 16 && e.buffer && UTF8Decoder) return UTF8Decoder.decode(e.subarray(t2, s4));
      for (var o4 = ""; t2 < s4; ) {
        var n3 = e[t2++];
        if (!(n3 & 128)) {
          o4 += String.fromCharCode(n3);
          continue;
        }
        var _3 = e[t2++] & 63;
        if ((n3 & 224) == 192) {
          o4 += String.fromCharCode((n3 & 31) << 6 | _3);
          continue;
        }
        var l3 = e[t2++] & 63;
        if ((n3 & 240) == 224 ? n3 = (n3 & 15) << 12 | _3 << 6 | l3 : n3 = (n3 & 7) << 18 | _3 << 12 | l3 << 6 | e[t2++] & 63, n3 < 65536) o4 += String.fromCharCode(n3);
        else {
          var p4 = n3 - 65536;
          o4 += String.fromCharCode(55296 | p4 >> 10, 56320 | p4 & 1023);
        }
      }
      return o4;
    }, getDylinkMetadata = (e) => {
      var t2 = 0, r = 0;
      function a2() {
        return e[t2++];
      }
      function s4() {
        for (var A2 = 0, D4 = 1; ; ) {
          var T5 = e[t2++];
          if (A2 += (T5 & 127) * D4, D4 *= 128, !(T5 & 128)) break;
        }
        return A2;
      }
      function o4() {
        var A2 = s4();
        return t2 += A2, UTF8ArrayToString(e, t2 - A2, A2);
      }
      function n3(A2, D4) {
        if (A2) throw new Error(D4);
      }
      var _3 = "dylink.0";
      if (e instanceof WebAssembly.Module) {
        var l3 = WebAssembly.Module.customSections(e, _3);
        l3.length === 0 && (_3 = "dylink", l3 = WebAssembly.Module.customSections(e, _3)), n3(l3.length === 0, "need dylink section"), e = new Uint8Array(l3[0]), r = e.length;
      } else {
        var p4 = new Uint32Array(new Uint8Array(e.subarray(0, 24)).buffer), m4 = p4[0] == 1836278016;
        n3(!m4, "need to see wasm magic number"), n3(e[8] !== 0, "need the dylink section to be first"), t2 = 9;
        var d2 = s4();
        r = t2 + d2, _3 = o4();
      }
      var g5 = { neededDynlibs: [], tlsExports: /* @__PURE__ */ new Set(), weakImports: /* @__PURE__ */ new Set() };
      if (_3 == "dylink") {
        g5.memorySize = s4(), g5.memoryAlign = s4(), g5.tableSize = s4(), g5.tableAlign = s4();
        for (var u2 = s4(), f3 = 0; f3 < u2; ++f3) {
          var c2 = o4();
          g5.neededDynlibs.push(c2);
        }
      } else {
        n3(_3 !== "dylink.0");
        for (var w4 = 1, x6 = 2, S3 = 3, v3 = 4, b3 = 256, E2 = 3, y4 = 1; t2 < r; ) {
          var F4 = a2(), R3 = s4();
          if (F4 === w4) g5.memorySize = s4(), g5.memoryAlign = s4(), g5.tableSize = s4(), g5.tableAlign = s4();
          else if (F4 === x6) for (var u2 = s4(), f3 = 0; f3 < u2; ++f3) c2 = o4(), g5.neededDynlibs.push(c2);
          else if (F4 === S3) for (var U3 = s4(); U3--; ) {
            var ee2 = o4(), N2 = s4();
            N2 & b3 && g5.tlsExports.add(ee2);
          }
          else if (F4 === v3) for (var U3 = s4(); U3--; ) {
            var H4 = o4(), ee2 = o4(), N2 = s4();
            (N2 & E2) == y4 && g5.weakImports.add(ee2);
          }
          else t2 += R3;
        }
      }
      return g5;
    };
    function getValue(e, t2 = "i8") {
      switch (t2.endsWith("*") && (t2 = "*"), t2) {
        case "i1":
          return HEAP8[e];
        case "i8":
          return HEAP8[e];
        case "i16":
          return HEAP16[e >> 1];
        case "i32":
          return HEAP32[e >> 2];
        case "i64":
          return HEAP64[e >> 3];
        case "float":
          return HEAPF32[e >> 2];
        case "double":
          return HEAPF64[e >> 3];
        case "*":
          return HEAPU32[e >> 2];
        default:
          abort(`invalid type for getValue: ${t2}`);
      }
    }
    var newDSO = (e, t2, r) => {
      var a2 = { refcount: 1 / 0, name: e, exports: r, global: true };
      return LDSO.loadedLibsByName[e] = a2, t2 != null && (LDSO.loadedLibsByHandle[t2] = a2), a2;
    }, LDSO = { loadedLibsByName: {}, loadedLibsByHandle: {}, init() {
      newDSO("__main__", 0, wasmImports);
    } }, ___heap_base = 2765600, alignMemory = (e, t2) => Math.ceil(e / t2) * t2, getMemory = (e) => {
      if (runtimeInitialized) return _calloc(e, 1);
      var t2 = ___heap_base, r = t2 + alignMemory(e, 16);
      return ___heap_base = r, GOT.__heap_base.value = r, t2;
    }, isInternalSym = (e) => ["__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js"].includes(e) || e.startsWith("__em_js__"), uleb128Encode = (e, t2) => {
      e < 128 ? t2.push(e) : t2.push(e % 128 | 128, e >> 7);
    }, sigToWasmTypes = (e) => {
      for (var t2 = { i: "i32", j: "i64", f: "f32", d: "f64", e: "externref", p: "i32" }, r = { parameters: [], results: e[0] == "v" ? [] : [t2[e[0]]] }, a2 = 1; a2 < e.length; ++a2) r.parameters.push(t2[e[a2]]);
      return r;
    }, generateFuncType = (e, t2) => {
      var r = e.slice(0, 1), a2 = e.slice(1), s4 = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 };
      t2.push(96), uleb128Encode(a2.length, t2);
      for (var o4 = 0; o4 < a2.length; ++o4) t2.push(s4[a2[o4]]);
      r == "v" ? t2.push(0) : t2.push(1, s4[r]);
    }, convertJsFunctionToWasm = (e, t2) => {
      if (typeof WebAssembly.Function == "function") return new WebAssembly.Function(sigToWasmTypes(t2), e);
      var r = [1];
      generateFuncType(t2, r);
      var a2 = [0, 97, 115, 109, 1, 0, 0, 0, 1];
      uleb128Encode(r.length, a2), a2.push(...r), a2.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
      var s4 = new WebAssembly.Module(new Uint8Array(a2)), o4 = new WebAssembly.Instance(s4, { e: { f: e } }), n3 = o4.exports.f;
      return n3;
    }, wasmTableMirror = [], wasmTable = new WebAssembly.Table({ initial: 5609, element: "anyfunc" }), getWasmTableEntry = (e) => {
      var t2 = wasmTableMirror[e];
      return t2 || (e >= wasmTableMirror.length && (wasmTableMirror.length = e + 1), wasmTableMirror[e] = t2 = wasmTable.get(e)), t2;
    }, updateTableMap = (e, t2) => {
      if (functionsInTableMap) for (var r = e; r < e + t2; r++) {
        var a2 = getWasmTableEntry(r);
        a2 && functionsInTableMap.set(a2, r);
      }
    }, functionsInTableMap, getFunctionAddress = (e) => (functionsInTableMap || (functionsInTableMap = /* @__PURE__ */ new WeakMap(), updateTableMap(0, wasmTable.length)), functionsInTableMap.get(e) || 0), freeTableIndexes = [], getEmptyTableSlot = () => {
      if (freeTableIndexes.length) return freeTableIndexes.pop();
      try {
        wasmTable.grow(1);
      } catch (e) {
        throw e instanceof RangeError ? "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH." : e;
      }
      return wasmTable.length - 1;
    }, setWasmTableEntry = (e, t2) => {
      wasmTable.set(e, t2), wasmTableMirror[e] = wasmTable.get(e);
    }, addFunction = (e, t2) => {
      var r = getFunctionAddress(e);
      if (r) return r;
      var a2 = getEmptyTableSlot();
      try {
        setWasmTableEntry(a2, e);
      } catch (o4) {
        if (!(o4 instanceof TypeError)) throw o4;
        var s4 = convertJsFunctionToWasm(e, t2);
        setWasmTableEntry(a2, s4);
      }
      return functionsInTableMap.set(e, a2), a2;
    }, updateGOT = (e, t2) => {
      for (var r in e) if (!isInternalSym(r)) {
        var a2 = e[r];
        GOT[r] || (GOT[r] = new WebAssembly.Global({ value: "i32", mutable: true })), (t2 || GOT[r].value == 0) && (typeof a2 == "function" ? GOT[r].value = addFunction(a2) : typeof a2 == "number" ? GOT[r].value = a2 : err(`unhandled export type for '${r}': ${typeof a2}`));
      }
    }, relocateExports = (e, t2, r) => {
      var a2 = {};
      for (var s4 in e) {
        var o4 = e[s4];
        typeof o4 == "object" && (o4 = o4.value), typeof o4 == "number" && (o4 += t2), a2[s4] = o4;
      }
      return updateGOT(a2, r), a2;
    }, isSymbolDefined = (e) => {
      var t2 = wasmImports[e];
      return !(!t2 || t2.stub);
    }, dynCall = (e, t2, r = []) => {
      var a2 = getWasmTableEntry(t2)(...r);
      return a2;
    }, stackSave = () => _emscripten_stack_get_current(), stackRestore = (e) => __emscripten_stack_restore(e), createInvokeFunction = (e) => (t2, ...r) => {
      var a2 = stackSave();
      try {
        return dynCall(e, t2, r);
      } catch (s4) {
        if (stackRestore(a2), s4 !== s4 + 0) throw s4;
        if (_setThrew(1, 0), e[0] == "j") return 0n;
      }
    }, resolveGlobalSymbol = (e, t2 = false) => {
      var r;
      return isSymbolDefined(e) ? r = wasmImports[e] : e.startsWith("invoke_") && (r = wasmImports[e] = createInvokeFunction(e.split("_")[1])), { sym: r, name: e };
    }, UTF8ToString = (e, t2) => e ? UTF8ArrayToString(HEAPU8, e, t2) : "", loadWebAssemblyModule = (binary, flags, libName, localScope, handle) => {
      var metadata = getDylinkMetadata(binary);
      currentModuleWeakSymbols = metadata.weakImports;
      function loadModule() {
        var firstLoad = !handle || !HEAP8[handle + 8];
        if (firstLoad) {
          var memAlign = Math.pow(2, metadata.memoryAlign), memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0, tableBase = metadata.tableSize ? wasmTable.length : 0;
          handle && (HEAP8[handle + 8] = 1, HEAPU32[handle + 12 >> 2] = memoryBase, HEAP32[handle + 16 >> 2] = metadata.memorySize, HEAPU32[handle + 20 >> 2] = tableBase, HEAP32[handle + 24 >> 2] = metadata.tableSize);
        } else memoryBase = HEAPU32[handle + 12 >> 2], tableBase = HEAPU32[handle + 20 >> 2];
        var tableGrowthNeeded = tableBase + metadata.tableSize - wasmTable.length;
        tableGrowthNeeded > 0 && wasmTable.grow(tableGrowthNeeded);
        var moduleExports;
        function resolveSymbol(e) {
          var t2 = resolveGlobalSymbol(e).sym;
          return !t2 && localScope && (t2 = localScope[e]), t2 || (t2 = moduleExports[e]), t2;
        }
        var proxyHandler = { get(e, t2) {
          switch (t2) {
            case "__memory_base":
              return memoryBase;
            case "__table_base":
              return tableBase;
          }
          if (t2 in wasmImports && !wasmImports[t2].stub) return wasmImports[t2];
          if (!(t2 in e)) {
            var r;
            e[t2] = (...a2) => (r || (r = resolveSymbol(t2)), r(...a2));
          }
          return e[t2];
        } }, proxy = new Proxy({}, proxyHandler), info = { "GOT.mem": new Proxy({}, GOTHandler), "GOT.func": new Proxy({}, GOTHandler), env: proxy, wasi_snapshot_preview1: proxy };
        function postInstantiation(module, instance) {
          updateTableMap(tableBase, metadata.tableSize), moduleExports = relocateExports(instance.exports, memoryBase), flags.allowUndefined || reportUndefinedSymbols();
          function addEmAsm(addr, body) {
            for (var args = [], arity = 0; arity < 16 && body.indexOf("$" + arity) != -1; arity++) args.push("$" + arity);
            args = args.join(",");
            var func = `(${args}) => { ${body} };`;
            ASM_CONSTS[start] = eval(func);
          }
          if ("__start_em_asm" in moduleExports) for (var start = moduleExports.__start_em_asm, stop = moduleExports.__stop_em_asm; start < stop; ) {
            var jsString = UTF8ToString(start);
            addEmAsm(start, jsString), start = HEAPU8.indexOf(0, start) + 1;
          }
          function addEmJs(name, cSig, body) {
            var jsArgs = [];
            if (cSig = cSig.slice(1, -1), cSig != "void") {
              cSig = cSig.split(",");
              for (var i in cSig) {
                var jsArg = cSig[i].split(" ").pop();
                jsArgs.push(jsArg.replace("*", ""));
              }
            }
            var func = `(${jsArgs}) => ${body};`;
            moduleExports[name] = eval(func);
          }
          for (var name in moduleExports) if (name.startsWith("__em_js__")) {
            var start = moduleExports[name], jsString = UTF8ToString(start), parts = jsString.split("<::>");
            addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]), delete moduleExports[name];
          }
          var applyRelocs = moduleExports.__wasm_apply_data_relocs;
          applyRelocs && (runtimeInitialized ? applyRelocs() : __RELOC_FUNCS__.push(applyRelocs));
          var init = moduleExports.__wasm_call_ctors;
          return init && (runtimeInitialized ? init() : __ATINIT__.push(init)), moduleExports;
        }
        if (flags.loadAsync) {
          if (binary instanceof WebAssembly.Module) {
            var instance = new WebAssembly.Instance(binary, info);
            return Promise.resolve(postInstantiation(binary, instance));
          }
          return WebAssembly.instantiate(binary, info).then((e) => postInstantiation(e.module, e.instance));
        }
        var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary), instance = new WebAssembly.Instance(module, info);
        return postInstantiation(module, instance);
      }
      return flags.loadAsync ? metadata.neededDynlibs.reduce((e, t2) => e.then(() => loadDynamicLibrary(t2, flags, localScope)), Promise.resolve()).then(loadModule) : (metadata.neededDynlibs.forEach((e) => loadDynamicLibrary(e, flags, localScope)), loadModule());
    }, mergeLibSymbols = (e, t2) => {
      for (var [r, a2] of Object.entries(e)) {
        let s4 = (n3) => {
          isSymbolDefined(n3) || (wasmImports[n3] = a2);
        };
        s4(r);
        let o4 = "__main_argc_argv";
        r == "main" && s4(o4), r == o4 && s4("main");
      }
    }, asyncLoad = async (e) => {
      var t2 = await readAsync(e);
      return new Uint8Array(t2);
    }, preloadPlugins = Module.preloadPlugins || [], registerWasmPlugin = () => {
      var e = { promiseChainEnd: Promise.resolve(), canHandle: (t2) => !Module.noWasmDecoding && t2.endsWith(".so"), handle: (t2, r, a2, s4) => {
        e.promiseChainEnd = e.promiseChainEnd.then(() => loadWebAssemblyModule(t2, { loadAsync: true, nodelete: true }, r, {})).then((o4) => {
          preloadedWasm[r] = o4, a2(t2);
        }, (o4) => {
          err(`failed to instantiate wasm: ${r}: ${o4}`), s4();
        });
      } };
      preloadPlugins.push(e);
    }, preloadedWasm = {};
    function loadDynamicLibrary(e, t2 = { global: true, nodelete: true }, r, a2) {
      var s4 = LDSO.loadedLibsByName[e];
      if (s4) return t2.global ? s4.global || (s4.global = true, mergeLibSymbols(s4.exports, e)) : r && Object.assign(r, s4.exports), t2.nodelete && s4.refcount !== 1 / 0 && (s4.refcount = 1 / 0), s4.refcount++, a2 && (LDSO.loadedLibsByHandle[a2] = s4), t2.loadAsync ? Promise.resolve(true) : true;
      s4 = newDSO(e, a2, "loading"), s4.refcount = t2.nodelete ? 1 / 0 : 1, s4.global = t2.global;
      function o4() {
        if (a2) {
          var l3 = HEAPU32[a2 + 28 >> 2], p4 = HEAPU32[a2 + 32 >> 2];
          if (l3 && p4) {
            var m4 = HEAP8.slice(l3, l3 + p4);
            return t2.loadAsync ? Promise.resolve(m4) : m4;
          }
        }
        var d2 = locateFile(e);
        if (t2.loadAsync) return asyncLoad(d2);
        if (!readBinary) throw new Error(`${d2}: file not found, and synchronous loading of external files is not available`);
        return readBinary(d2);
      }
      function n3() {
        var l3 = preloadedWasm[e];
        return l3 ? t2.loadAsync ? Promise.resolve(l3) : l3 : t2.loadAsync ? o4().then((p4) => loadWebAssemblyModule(p4, t2, e, r, a2)) : loadWebAssemblyModule(o4(), t2, e, r, a2);
      }
      function _3(l3) {
        s4.global ? mergeLibSymbols(l3, e) : r && Object.assign(r, l3), s4.exports = l3;
      }
      return t2.loadAsync ? n3().then((l3) => (_3(l3), true)) : (_3(n3()), true);
    }
    var reportUndefinedSymbols = () => {
      for (var [e, t2] of Object.entries(GOT)) if (t2.value == 0) {
        var r = resolveGlobalSymbol(e, true).sym;
        if (!r && !t2.required) continue;
        if (typeof r == "function") t2.value = addFunction(r, r.sig);
        else if (typeof r == "number") t2.value = r;
        else throw new Error(`bad export type for '${e}': ${typeof r}`);
      }
    }, loadDylibs = () => {
      if (!dynamicLibraries.length) {
        reportUndefinedSymbols();
        return;
      }
      addRunDependency("loadDylibs"), dynamicLibraries.reduce((e, t2) => e.then(() => loadDynamicLibrary(t2, { loadAsync: true, global: true, nodelete: true, allowUndefined: true })), Promise.resolve()).then(() => {
        reportUndefinedSymbols(), removeRunDependency("loadDylibs");
      });
    }, noExitRuntime = Module.noExitRuntime || true;
    function setValue(e, t2, r = "i8") {
      switch (r.endsWith("*") && (r = "*"), r) {
        case "i1":
          HEAP8[e] = t2;
          break;
        case "i8":
          HEAP8[e] = t2;
          break;
        case "i16":
          HEAP16[e >> 1] = t2;
          break;
        case "i32":
          HEAP32[e >> 2] = t2;
          break;
        case "i64":
          HEAP64[e >> 3] = BigInt(t2);
          break;
        case "float":
          HEAPF32[e >> 2] = t2;
          break;
        case "double":
          HEAPF64[e >> 3] = t2;
          break;
        case "*":
          HEAPU32[e >> 2] = t2;
          break;
        default:
          abort(`invalid type for setValue: ${r}`);
      }
    }
    var ___assert_fail = (e, t2, r, a2) => abort(`Assertion failed: ${UTF8ToString(e)}, at: ` + [t2 ? UTF8ToString(t2) : "unknown filename", r, a2 ? UTF8ToString(a2) : "unknown function"]);
    ___assert_fail.sig = "vppip";
    var ___call_sighandler = (e, t2) => getWasmTableEntry(e)(t2);
    ___call_sighandler.sig = "vpi";
    var ___memory_base = new WebAssembly.Global({ value: "i32", mutable: false }, 1024);
    Module.___memory_base = ___memory_base;
    var ___stack_pointer = new WebAssembly.Global({ value: "i32", mutable: true }, 2765600);
    Module.___stack_pointer = ___stack_pointer;
    var PATH = { isAbs: (e) => e.charAt(0) === "/", splitPath: (e) => {
      var t2 = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
      return t2.exec(e).slice(1);
    }, normalizeArray: (e, t2) => {
      for (var r = 0, a2 = e.length - 1; a2 >= 0; a2--) {
        var s4 = e[a2];
        s4 === "." ? e.splice(a2, 1) : s4 === ".." ? (e.splice(a2, 1), r++) : r && (e.splice(a2, 1), r--);
      }
      if (t2) for (; r; r--) e.unshift("..");
      return e;
    }, normalize: (e) => {
      var t2 = PATH.isAbs(e), r = e.substr(-1) === "/";
      return e = PATH.normalizeArray(e.split("/").filter((a2) => !!a2), !t2).join("/"), !e && !t2 && (e = "."), e && r && (e += "/"), (t2 ? "/" : "") + e;
    }, dirname: (e) => {
      var t2 = PATH.splitPath(e), r = t2[0], a2 = t2[1];
      return !r && !a2 ? "." : (a2 && (a2 = a2.substr(0, a2.length - 1)), r + a2);
    }, basename: (e) => {
      if (e === "/") return "/";
      e = PATH.normalize(e), e = e.replace(/\/$/, "");
      var t2 = e.lastIndexOf("/");
      return t2 === -1 ? e : e.substr(t2 + 1);
    }, join: (...e) => PATH.normalize(e.join("/")), join2: (e, t2) => PATH.normalize(e + "/" + t2) }, initRandomFill = () => {
      if (typeof crypto == "object" && typeof crypto.getRandomValues == "function") return (a2) => crypto.getRandomValues(a2);
      if (ENVIRONMENT_IS_NODE) try {
        var e = require("crypto"), t2 = e.randomFillSync;
        if (t2) return (a2) => e.randomFillSync(a2);
        var r = e.randomBytes;
        return (a2) => (a2.set(r(a2.byteLength)), a2);
      } catch {
      }
      abort("initRandomDevice");
    }, randomFill = (e) => (randomFill = initRandomFill())(e), PATH_FS = { resolve: (...e) => {
      for (var t2 = "", r = false, a2 = e.length - 1; a2 >= -1 && !r; a2--) {
        var s4 = a2 >= 0 ? e[a2] : FS.cwd();
        if (typeof s4 != "string") throw new TypeError("Arguments to path.resolve must be strings");
        if (!s4) return "";
        t2 = s4 + "/" + t2, r = PATH.isAbs(s4);
      }
      return t2 = PATH.normalizeArray(t2.split("/").filter((o4) => !!o4), !r).join("/"), (r ? "/" : "") + t2 || ".";
    }, relative: (e, t2) => {
      e = PATH_FS.resolve(e).substr(1), t2 = PATH_FS.resolve(t2).substr(1);
      function r(p4) {
        for (var m4 = 0; m4 < p4.length && p4[m4] === ""; m4++) ;
        for (var d2 = p4.length - 1; d2 >= 0 && p4[d2] === ""; d2--) ;
        return m4 > d2 ? [] : p4.slice(m4, d2 - m4 + 1);
      }
      for (var a2 = r(e.split("/")), s4 = r(t2.split("/")), o4 = Math.min(a2.length, s4.length), n3 = o4, _3 = 0; _3 < o4; _3++) if (a2[_3] !== s4[_3]) {
        n3 = _3;
        break;
      }
      for (var l3 = [], _3 = n3; _3 < a2.length; _3++) l3.push("..");
      return l3 = l3.concat(s4.slice(n3)), l3.join("/");
    } }, FS_stdin_getChar_buffer = [], lengthBytesUTF8 = (e) => {
      for (var t2 = 0, r = 0; r < e.length; ++r) {
        var a2 = e.charCodeAt(r);
        a2 <= 127 ? t2++ : a2 <= 2047 ? t2 += 2 : a2 >= 55296 && a2 <= 57343 ? (t2 += 4, ++r) : t2 += 3;
      }
      return t2;
    }, stringToUTF8Array = (e, t2, r, a2) => {
      if (!(a2 > 0)) return 0;
      for (var s4 = r, o4 = r + a2 - 1, n3 = 0; n3 < e.length; ++n3) {
        var _3 = e.charCodeAt(n3);
        if (_3 >= 55296 && _3 <= 57343) {
          var l3 = e.charCodeAt(++n3);
          _3 = 65536 + ((_3 & 1023) << 10) | l3 & 1023;
        }
        if (_3 <= 127) {
          if (r >= o4) break;
          t2[r++] = _3;
        } else if (_3 <= 2047) {
          if (r + 1 >= o4) break;
          t2[r++] = 192 | _3 >> 6, t2[r++] = 128 | _3 & 63;
        } else if (_3 <= 65535) {
          if (r + 2 >= o4) break;
          t2[r++] = 224 | _3 >> 12, t2[r++] = 128 | _3 >> 6 & 63, t2[r++] = 128 | _3 & 63;
        } else {
          if (r + 3 >= o4) break;
          t2[r++] = 240 | _3 >> 18, t2[r++] = 128 | _3 >> 12 & 63, t2[r++] = 128 | _3 >> 6 & 63, t2[r++] = 128 | _3 & 63;
        }
      }
      return t2[r] = 0, r - s4;
    };
    function intArrayFromString(e, t2, r) {
      var a2 = r > 0 ? r : lengthBytesUTF8(e) + 1, s4 = new Array(a2), o4 = stringToUTF8Array(e, s4, 0, s4.length);
      return t2 && (s4.length = o4), s4;
    }
    var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var e = null;
        if (ENVIRONMENT_IS_NODE) {
          var t2 = 256, r = Buffer.alloc(t2), a2 = 0, s4 = process.stdin.fd;
          try {
            a2 = fs.readSync(s4, r, 0, t2);
          } catch (o4) {
            if (o4.toString().includes("EOF")) a2 = 0;
            else throw o4;
          }
          a2 > 0 && (e = r.slice(0, a2).toString("utf-8"));
        } else typeof window < "u" && typeof window.prompt == "function" && (e = window.prompt("Input: "), e !== null && (e += `
`));
        if (!e) return null;
        FS_stdin_getChar_buffer = intArrayFromString(e, true);
      }
      return FS_stdin_getChar_buffer.shift();
    }, TTY = { ttys: [], init() {
    }, shutdown() {
    }, register(e, t2) {
      TTY.ttys[e] = { input: [], output: [], ops: t2 }, FS.registerDevice(e, TTY.stream_ops);
    }, stream_ops: { open(e) {
      var t2 = TTY.ttys[e.node.rdev];
      if (!t2) throw new FS.ErrnoError(43);
      e.tty = t2, e.seekable = false;
    }, close(e) {
      e.tty.ops.fsync(e.tty);
    }, fsync(e) {
      e.tty.ops.fsync(e.tty);
    }, read(e, t2, r, a2, s4) {
      if (!e.tty || !e.tty.ops.get_char) throw new FS.ErrnoError(60);
      for (var o4 = 0, n3 = 0; n3 < a2; n3++) {
        var _3;
        try {
          _3 = e.tty.ops.get_char(e.tty);
        } catch {
          throw new FS.ErrnoError(29);
        }
        if (_3 === void 0 && o4 === 0) throw new FS.ErrnoError(6);
        if (_3 == null) break;
        o4++, t2[r + n3] = _3;
      }
      return o4 && (e.node.atime = Date.now()), o4;
    }, write(e, t2, r, a2, s4) {
      if (!e.tty || !e.tty.ops.put_char) throw new FS.ErrnoError(60);
      try {
        for (var o4 = 0; o4 < a2; o4++) e.tty.ops.put_char(e.tty, t2[r + o4]);
      } catch {
        throw new FS.ErrnoError(29);
      }
      return a2 && (e.node.mtime = e.node.ctime = Date.now()), o4;
    } }, default_tty_ops: { get_char(e) {
      return FS_stdin_getChar();
    }, put_char(e, t2) {
      t2 === null || t2 === 10 ? (out(UTF8ArrayToString(e.output)), e.output = []) : t2 != 0 && e.output.push(t2);
    }, fsync(e) {
      e.output && e.output.length > 0 && (out(UTF8ArrayToString(e.output)), e.output = []);
    }, ioctl_tcgets(e) {
      return { c_iflag: 25856, c_oflag: 5, c_cflag: 191, c_lflag: 35387, c_cc: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    }, ioctl_tcsets(e, t2, r) {
      return 0;
    }, ioctl_tiocgwinsz(e) {
      return [24, 80];
    } }, default_tty1_ops: { put_char(e, t2) {
      t2 === null || t2 === 10 ? (err(UTF8ArrayToString(e.output)), e.output = []) : t2 != 0 && e.output.push(t2);
    }, fsync(e) {
      e.output && e.output.length > 0 && (err(UTF8ArrayToString(e.output)), e.output = []);
    } } }, zeroMemory = (e, t2) => {
      HEAPU8.fill(0, e, e + t2);
    }, mmapAlloc = (e) => {
      e = alignMemory(e, 65536);
      var t2 = _emscripten_builtin_memalign(65536, e);
      return t2 && zeroMemory(t2, e), t2;
    }, MEMFS = { ops_table: null, mount(e) {
      return MEMFS.createNode(null, "/", 16895, 0);
    }, createNode(e, t2, r, a2) {
      if (FS.isBlkdev(r) || FS.isFIFO(r)) throw new FS.ErrnoError(63);
      MEMFS.ops_table || (MEMFS.ops_table = { dir: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, lookup: MEMFS.node_ops.lookup, mknod: MEMFS.node_ops.mknod, rename: MEMFS.node_ops.rename, unlink: MEMFS.node_ops.unlink, rmdir: MEMFS.node_ops.rmdir, readdir: MEMFS.node_ops.readdir, symlink: MEMFS.node_ops.symlink }, stream: { llseek: MEMFS.stream_ops.llseek } }, file: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: { llseek: MEMFS.stream_ops.llseek, read: MEMFS.stream_ops.read, write: MEMFS.stream_ops.write, allocate: MEMFS.stream_ops.allocate, mmap: MEMFS.stream_ops.mmap, msync: MEMFS.stream_ops.msync } }, link: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, readlink: MEMFS.node_ops.readlink }, stream: {} }, chrdev: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: FS.chrdev_stream_ops } });
      var s4 = FS.createNode(e, t2, r, a2);
      return FS.isDir(s4.mode) ? (s4.node_ops = MEMFS.ops_table.dir.node, s4.stream_ops = MEMFS.ops_table.dir.stream, s4.contents = {}) : FS.isFile(s4.mode) ? (s4.node_ops = MEMFS.ops_table.file.node, s4.stream_ops = MEMFS.ops_table.file.stream, s4.usedBytes = 0, s4.contents = null) : FS.isLink(s4.mode) ? (s4.node_ops = MEMFS.ops_table.link.node, s4.stream_ops = MEMFS.ops_table.link.stream) : FS.isChrdev(s4.mode) && (s4.node_ops = MEMFS.ops_table.chrdev.node, s4.stream_ops = MEMFS.ops_table.chrdev.stream), s4.atime = s4.mtime = s4.ctime = Date.now(), e && (e.contents[t2] = s4, e.atime = e.mtime = e.ctime = s4.atime), s4;
    }, getFileDataAsTypedArray(e) {
      return e.contents ? e.contents.subarray ? e.contents.subarray(0, e.usedBytes) : new Uint8Array(e.contents) : new Uint8Array(0);
    }, expandFileStorage(e, t2) {
      var r = e.contents ? e.contents.length : 0;
      if (!(r >= t2)) {
        var a2 = 1024 * 1024;
        t2 = Math.max(t2, r * (r < a2 ? 2 : 1.125) >>> 0), r != 0 && (t2 = Math.max(t2, 256));
        var s4 = e.contents;
        e.contents = new Uint8Array(t2), e.usedBytes > 0 && e.contents.set(s4.subarray(0, e.usedBytes), 0);
      }
    }, resizeFileStorage(e, t2) {
      if (e.usedBytes != t2) if (t2 == 0) e.contents = null, e.usedBytes = 0;
      else {
        var r = e.contents;
        e.contents = new Uint8Array(t2), r && e.contents.set(r.subarray(0, Math.min(t2, e.usedBytes))), e.usedBytes = t2;
      }
    }, node_ops: { getattr(e) {
      var t2 = {};
      return t2.dev = FS.isChrdev(e.mode) ? e.id : 1, t2.ino = e.id, t2.mode = e.mode, t2.nlink = 1, t2.uid = 0, t2.gid = 0, t2.rdev = e.rdev, FS.isDir(e.mode) ? t2.size = 4096 : FS.isFile(e.mode) ? t2.size = e.usedBytes : FS.isLink(e.mode) ? t2.size = e.link.length : t2.size = 0, t2.atime = new Date(e.atime), t2.mtime = new Date(e.mtime), t2.ctime = new Date(e.ctime), t2.blksize = 4096, t2.blocks = Math.ceil(t2.size / t2.blksize), t2;
    }, setattr(e, t2) {
      for (let r of ["mode", "atime", "mtime", "ctime"]) t2[r] && (e[r] = t2[r]);
      t2.size !== void 0 && MEMFS.resizeFileStorage(e, t2.size);
    }, lookup(e, t2) {
      throw MEMFS.doesNotExistError;
    }, mknod(e, t2, r, a2) {
      return MEMFS.createNode(e, t2, r, a2);
    }, rename(e, t2, r) {
      var a2;
      try {
        a2 = FS.lookupNode(t2, r);
      } catch {
      }
      if (a2) {
        if (FS.isDir(e.mode)) for (var s4 in a2.contents) throw new FS.ErrnoError(55);
        FS.hashRemoveNode(a2);
      }
      delete e.parent.contents[e.name], t2.contents[r] = e, e.name = r, t2.ctime = t2.mtime = e.parent.ctime = e.parent.mtime = Date.now();
    }, unlink(e, t2) {
      delete e.contents[t2], e.ctime = e.mtime = Date.now();
    }, rmdir(e, t2) {
      var r = FS.lookupNode(e, t2);
      for (var a2 in r.contents) throw new FS.ErrnoError(55);
      delete e.contents[t2], e.ctime = e.mtime = Date.now();
    }, readdir(e) {
      return [".", "..", ...Object.keys(e.contents)];
    }, symlink(e, t2, r) {
      var a2 = MEMFS.createNode(e, t2, 41471, 0);
      return a2.link = r, a2;
    }, readlink(e) {
      if (!FS.isLink(e.mode)) throw new FS.ErrnoError(28);
      return e.link;
    } }, stream_ops: { read(e, t2, r, a2, s4) {
      var o4 = e.node.contents;
      if (s4 >= e.node.usedBytes) return 0;
      var n3 = Math.min(e.node.usedBytes - s4, a2);
      if (n3 > 8 && o4.subarray) t2.set(o4.subarray(s4, s4 + n3), r);
      else for (var _3 = 0; _3 < n3; _3++) t2[r + _3] = o4[s4 + _3];
      return n3;
    }, write(e, t2, r, a2, s4, o4) {
      if (t2.buffer === HEAP8.buffer && (o4 = false), !a2) return 0;
      var n3 = e.node;
      if (n3.mtime = n3.ctime = Date.now(), t2.subarray && (!n3.contents || n3.contents.subarray)) {
        if (o4) return n3.contents = t2.subarray(r, r + a2), n3.usedBytes = a2, a2;
        if (n3.usedBytes === 0 && s4 === 0) return n3.contents = t2.slice(r, r + a2), n3.usedBytes = a2, a2;
        if (s4 + a2 <= n3.usedBytes) return n3.contents.set(t2.subarray(r, r + a2), s4), a2;
      }
      if (MEMFS.expandFileStorage(n3, s4 + a2), n3.contents.subarray && t2.subarray) n3.contents.set(t2.subarray(r, r + a2), s4);
      else for (var _3 = 0; _3 < a2; _3++) n3.contents[s4 + _3] = t2[r + _3];
      return n3.usedBytes = Math.max(n3.usedBytes, s4 + a2), a2;
    }, llseek(e, t2, r) {
      var a2 = t2;
      if (r === 1 ? a2 += e.position : r === 2 && FS.isFile(e.node.mode) && (a2 += e.node.usedBytes), a2 < 0) throw new FS.ErrnoError(28);
      return a2;
    }, allocate(e, t2, r) {
      MEMFS.expandFileStorage(e.node, t2 + r), e.node.usedBytes = Math.max(e.node.usedBytes, t2 + r);
    }, mmap(e, t2, r, a2, s4) {
      if (!FS.isFile(e.node.mode)) throw new FS.ErrnoError(43);
      var o4, n3, _3 = e.node.contents;
      if (!(s4 & 2) && _3 && _3.buffer === HEAP8.buffer) n3 = false, o4 = _3.byteOffset;
      else {
        if (n3 = true, o4 = mmapAlloc(t2), !o4) throw new FS.ErrnoError(48);
        _3 && ((r > 0 || r + t2 < _3.length) && (_3.subarray ? _3 = _3.subarray(r, r + t2) : _3 = Array.prototype.slice.call(_3, r, r + t2)), HEAP8.set(_3, o4));
      }
      return { ptr: o4, allocated: n3 };
    }, msync(e, t2, r, a2, s4) {
      return MEMFS.stream_ops.write(e, t2, 0, a2, r, false), 0;
    } } }, FS_createDataFile = (e, t2, r, a2, s4, o4) => {
      FS.createDataFile(e, t2, r, a2, s4, o4);
    }, FS_handledByPreloadPlugin = (e, t2, r, a2) => {
      typeof Browser < "u" && Browser.init();
      var s4 = false;
      return preloadPlugins.forEach((o4) => {
        s4 || o4.canHandle(t2) && (o4.handle(e, t2, r, a2), s4 = true);
      }), s4;
    }, FS_createPreloadedFile = (e, t2, r, a2, s4, o4, n3, _3, l3, p4) => {
      var m4 = t2 ? PATH_FS.resolve(PATH.join2(e, t2)) : e, d2 = `cp ${m4}`;
      function g5(u2) {
        function f3(c2) {
          p4?.(), _3 || FS_createDataFile(e, t2, c2, a2, s4, l3), o4?.(), removeRunDependency(d2);
        }
        FS_handledByPreloadPlugin(u2, m4, f3, () => {
          n3?.(), removeRunDependency(d2);
        }) || f3(u2);
      }
      addRunDependency(d2), typeof r == "string" ? asyncLoad(r).then(g5, n3) : g5(r);
    }, FS_modeStringToFlags = (e) => {
      var t2 = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }, r = t2[e];
      if (typeof r > "u") throw new Error(`Unknown file open mode: ${e}`);
      return r;
    }, FS_getMode = (e, t2) => {
      var r = 0;
      return e && (r |= 365), t2 && (r |= 146), r;
    }, IDBFS = { dbs: {}, indexedDB: () => {
      if (typeof indexedDB < "u") return indexedDB;
      var e = null;
      return typeof window == "object" && (e = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB), e;
    }, DB_VERSION: 21, DB_STORE_NAME: "FILE_DATA", queuePersist: (e) => {
      function t2() {
        e.idbPersistState === "again" ? r() : e.idbPersistState = 0;
      }
      function r() {
        e.idbPersistState = "idb", IDBFS.syncfs(e, false, t2);
      }
      e.idbPersistState ? e.idbPersistState === "idb" && (e.idbPersistState = "again") : e.idbPersistState = setTimeout(r, 0);
    }, mount: (e) => {
      var t2 = MEMFS.mount(e);
      if (e?.opts?.autoPersist) {
        t2.idbPersistState = 0;
        var r = t2.node_ops;
        t2.node_ops = Object.assign({}, t2.node_ops), t2.node_ops.mknod = (a2, s4, o4, n3) => {
          var _3 = r.mknod(a2, s4, o4, n3);
          return _3.node_ops = t2.node_ops, _3.idbfs_mount = t2.mount, _3.memfs_stream_ops = _3.stream_ops, _3.stream_ops = Object.assign({}, _3.stream_ops), _3.stream_ops.write = (l3, p4, m4, d2, g5, u2) => (l3.node.isModified = true, _3.memfs_stream_ops.write(l3, p4, m4, d2, g5, u2)), _3.stream_ops.close = (l3) => {
            var p4 = l3.node;
            if (p4.isModified && (IDBFS.queuePersist(p4.idbfs_mount), p4.isModified = false), p4.memfs_stream_ops.close) return p4.memfs_stream_ops.close(l3);
          }, _3;
        }, t2.node_ops.mkdir = (...a2) => (IDBFS.queuePersist(t2.mount), r.mkdir(...a2)), t2.node_ops.rmdir = (...a2) => (IDBFS.queuePersist(t2.mount), r.rmdir(...a2)), t2.node_ops.symlink = (...a2) => (IDBFS.queuePersist(t2.mount), r.symlink(...a2)), t2.node_ops.unlink = (...a2) => (IDBFS.queuePersist(t2.mount), r.unlink(...a2)), t2.node_ops.rename = (...a2) => (IDBFS.queuePersist(t2.mount), r.rename(...a2));
      }
      return t2;
    }, syncfs: (e, t2, r) => {
      IDBFS.getLocalSet(e, (a2, s4) => {
        if (a2) return r(a2);
        IDBFS.getRemoteSet(e, (o4, n3) => {
          if (o4) return r(o4);
          var _3 = t2 ? n3 : s4, l3 = t2 ? s4 : n3;
          IDBFS.reconcile(_3, l3, r);
        });
      });
    }, quit: () => {
      Object.values(IDBFS.dbs).forEach((e) => e.close()), IDBFS.dbs = {};
    }, getDB: (e, t2) => {
      var r = IDBFS.dbs[e];
      if (r) return t2(null, r);
      var a2;
      try {
        a2 = IDBFS.indexedDB().open(e, IDBFS.DB_VERSION);
      } catch (s4) {
        return t2(s4);
      }
      if (!a2) return t2("Unable to connect to IndexedDB");
      a2.onupgradeneeded = (s4) => {
        var o4 = s4.target.result, n3 = s4.target.transaction, _3;
        o4.objectStoreNames.contains(IDBFS.DB_STORE_NAME) ? _3 = n3.objectStore(IDBFS.DB_STORE_NAME) : _3 = o4.createObjectStore(IDBFS.DB_STORE_NAME), _3.indexNames.contains("timestamp") || _3.createIndex("timestamp", "timestamp", { unique: false });
      }, a2.onsuccess = () => {
        r = a2.result, IDBFS.dbs[e] = r, t2(null, r);
      }, a2.onerror = (s4) => {
        t2(s4.target.error), s4.preventDefault();
      };
    }, getLocalSet: (e, t2) => {
      var r = {};
      function a2(l3) {
        return l3 !== "." && l3 !== "..";
      }
      function s4(l3) {
        return (p4) => PATH.join2(l3, p4);
      }
      for (var o4 = FS.readdir(e.mountpoint).filter(a2).map(s4(e.mountpoint)); o4.length; ) {
        var n3 = o4.pop(), _3;
        try {
          _3 = FS.stat(n3);
        } catch (l3) {
          return t2(l3);
        }
        FS.isDir(_3.mode) && o4.push(...FS.readdir(n3).filter(a2).map(s4(n3))), r[n3] = { timestamp: _3.mtime };
      }
      return t2(null, { type: "local", entries: r });
    }, getRemoteSet: (e, t2) => {
      var r = {};
      IDBFS.getDB(e.mountpoint, (a2, s4) => {
        if (a2) return t2(a2);
        try {
          var o4 = s4.transaction([IDBFS.DB_STORE_NAME], "readonly");
          o4.onerror = (l3) => {
            t2(l3.target.error), l3.preventDefault();
          };
          var n3 = o4.objectStore(IDBFS.DB_STORE_NAME), _3 = n3.index("timestamp");
          _3.openKeyCursor().onsuccess = (l3) => {
            var p4 = l3.target.result;
            if (!p4) return t2(null, { type: "remote", db: s4, entries: r });
            r[p4.primaryKey] = { timestamp: p4.key }, p4.continue();
          };
        } catch (l3) {
          return t2(l3);
        }
      });
    }, loadLocalEntry: (e, t2) => {
      var r, a2;
      try {
        var s4 = FS.lookupPath(e);
        a2 = s4.node, r = FS.stat(e);
      } catch (o4) {
        return t2(o4);
      }
      return FS.isDir(r.mode) ? t2(null, { timestamp: r.mtime, mode: r.mode }) : FS.isFile(r.mode) ? (a2.contents = MEMFS.getFileDataAsTypedArray(a2), t2(null, { timestamp: r.mtime, mode: r.mode, contents: a2.contents })) : t2(new Error("node type not supported"));
    }, storeLocalEntry: (e, t2, r) => {
      try {
        if (FS.isDir(t2.mode)) FS.mkdirTree(e, t2.mode);
        else if (FS.isFile(t2.mode)) FS.writeFile(e, t2.contents, { canOwn: true });
        else return r(new Error("node type not supported"));
        FS.chmod(e, t2.mode), FS.utime(e, t2.timestamp, t2.timestamp);
      } catch (a2) {
        return r(a2);
      }
      r(null);
    }, removeLocalEntry: (e, t2) => {
      try {
        var r = FS.stat(e);
        FS.isDir(r.mode) ? FS.rmdir(e) : FS.isFile(r.mode) && FS.unlink(e);
      } catch (a2) {
        return t2(a2);
      }
      t2(null);
    }, loadRemoteEntry: (e, t2, r) => {
      var a2 = e.get(t2);
      a2.onsuccess = (s4) => r(null, s4.target.result), a2.onerror = (s4) => {
        r(s4.target.error), s4.preventDefault();
      };
    }, storeRemoteEntry: (e, t2, r, a2) => {
      try {
        var s4 = e.put(r, t2);
      } catch (o4) {
        a2(o4);
        return;
      }
      s4.onsuccess = (o4) => a2(), s4.onerror = (o4) => {
        a2(o4.target.error), o4.preventDefault();
      };
    }, removeRemoteEntry: (e, t2, r) => {
      var a2 = e.delete(t2);
      a2.onsuccess = (s4) => r(), a2.onerror = (s4) => {
        r(s4.target.error), s4.preventDefault();
      };
    }, reconcile: (e, t2, r) => {
      var a2 = 0, s4 = [];
      Object.keys(e.entries).forEach((d2) => {
        var g5 = e.entries[d2], u2 = t2.entries[d2];
        (!u2 || g5.timestamp.getTime() != u2.timestamp.getTime()) && (s4.push(d2), a2++);
      });
      var o4 = [];
      if (Object.keys(t2.entries).forEach((d2) => {
        e.entries[d2] || (o4.push(d2), a2++);
      }), !a2) return r(null);
      var n3 = false, _3 = e.type === "remote" ? e.db : t2.db, l3 = _3.transaction([IDBFS.DB_STORE_NAME], "readwrite"), p4 = l3.objectStore(IDBFS.DB_STORE_NAME);
      function m4(d2) {
        if (d2 && !n3) return n3 = true, r(d2);
      }
      l3.onerror = l3.onabort = (d2) => {
        m4(d2.target.error), d2.preventDefault();
      }, l3.oncomplete = (d2) => {
        n3 || r(null);
      }, s4.sort().forEach((d2) => {
        t2.type === "local" ? IDBFS.loadRemoteEntry(p4, d2, (g5, u2) => {
          if (g5) return m4(g5);
          IDBFS.storeLocalEntry(d2, u2, m4);
        }) : IDBFS.loadLocalEntry(d2, (g5, u2) => {
          if (g5) return m4(g5);
          IDBFS.storeRemoteEntry(p4, d2, u2, m4);
        });
      }), o4.sort().reverse().forEach((d2) => {
        t2.type === "local" ? IDBFS.removeLocalEntry(d2, m4) : IDBFS.removeRemoteEntry(p4, d2, m4);
      });
    } }, ERRNO_CODES = { EPERM: 63, ENOENT: 44, ESRCH: 71, EINTR: 27, EIO: 29, ENXIO: 60, E2BIG: 1, ENOEXEC: 45, EBADF: 8, ECHILD: 12, EAGAIN: 6, EWOULDBLOCK: 6, ENOMEM: 48, EACCES: 2, EFAULT: 21, ENOTBLK: 105, EBUSY: 10, EEXIST: 20, EXDEV: 75, ENODEV: 43, ENOTDIR: 54, EISDIR: 31, EINVAL: 28, ENFILE: 41, EMFILE: 33, ENOTTY: 59, ETXTBSY: 74, EFBIG: 22, ENOSPC: 51, ESPIPE: 70, EROFS: 69, EMLINK: 34, EPIPE: 64, EDOM: 18, ERANGE: 68, ENOMSG: 49, EIDRM: 24, ECHRNG: 106, EL2NSYNC: 156, EL3HLT: 107, EL3RST: 108, ELNRNG: 109, EUNATCH: 110, ENOCSI: 111, EL2HLT: 112, EDEADLK: 16, ENOLCK: 46, EBADE: 113, EBADR: 114, EXFULL: 115, ENOANO: 104, EBADRQC: 103, EBADSLT: 102, EDEADLOCK: 16, EBFONT: 101, ENOSTR: 100, ENODATA: 116, ETIME: 117, ENOSR: 118, ENONET: 119, ENOPKG: 120, EREMOTE: 121, ENOLINK: 47, EADV: 122, ESRMNT: 123, ECOMM: 124, EPROTO: 65, EMULTIHOP: 36, EDOTDOT: 125, EBADMSG: 9, ENOTUNIQ: 126, EBADFD: 127, EREMCHG: 128, ELIBACC: 129, ELIBBAD: 130, ELIBSCN: 131, ELIBMAX: 132, ELIBEXEC: 133, ENOSYS: 52, ENOTEMPTY: 55, ENAMETOOLONG: 37, ELOOP: 32, EOPNOTSUPP: 138, EPFNOSUPPORT: 139, ECONNRESET: 15, ENOBUFS: 42, EAFNOSUPPORT: 5, EPROTOTYPE: 67, ENOTSOCK: 57, ENOPROTOOPT: 50, ESHUTDOWN: 140, ECONNREFUSED: 14, EADDRINUSE: 3, ECONNABORTED: 13, ENETUNREACH: 40, ENETDOWN: 38, ETIMEDOUT: 73, EHOSTDOWN: 142, EHOSTUNREACH: 23, EINPROGRESS: 26, EALREADY: 7, EDESTADDRREQ: 17, EMSGSIZE: 35, EPROTONOSUPPORT: 66, ESOCKTNOSUPPORT: 137, EADDRNOTAVAIL: 4, ENETRESET: 39, EISCONN: 30, ENOTCONN: 53, ETOOMANYREFS: 141, EUSERS: 136, EDQUOT: 19, ESTALE: 72, ENOTSUP: 138, ENOMEDIUM: 148, EILSEQ: 25, EOVERFLOW: 61, ECANCELED: 11, ENOTRECOVERABLE: 56, EOWNERDEAD: 62, ESTRPIPE: 135 }, NODEFS = { isWindows: false, staticInit() {
      NODEFS.isWindows = !!process.platform.match(/^win/);
      var e = process.binding("constants");
      e.fs && (e = e.fs), NODEFS.flagsForNodeMap = { 1024: e.O_APPEND, 64: e.O_CREAT, 128: e.O_EXCL, 256: e.O_NOCTTY, 0: e.O_RDONLY, 2: e.O_RDWR, 4096: e.O_SYNC, 512: e.O_TRUNC, 1: e.O_WRONLY, 131072: e.O_NOFOLLOW };
    }, convertNodeCode(e) {
      var t2 = e.code;
      return ERRNO_CODES[t2];
    }, tryFSOperation(e) {
      try {
        return e();
      } catch (t2) {
        throw t2.code ? t2.code === "UNKNOWN" ? new FS.ErrnoError(28) : new FS.ErrnoError(NODEFS.convertNodeCode(t2)) : t2;
      }
    }, mount(e) {
      return NODEFS.createNode(null, "/", NODEFS.getMode(e.opts.root), 0);
    }, createNode(e, t2, r, a2) {
      if (!FS.isDir(r) && !FS.isFile(r) && !FS.isLink(r)) throw new FS.ErrnoError(28);
      var s4 = FS.createNode(e, t2, r);
      return s4.node_ops = NODEFS.node_ops, s4.stream_ops = NODEFS.stream_ops, s4;
    }, getMode(e) {
      return NODEFS.tryFSOperation(() => {
        var t2 = fs.lstatSync(e).mode;
        return NODEFS.isWindows && (t2 |= (t2 & 292) >> 2), t2;
      });
    }, realPath(e) {
      for (var t2 = []; e.parent !== e; ) t2.push(e.name), e = e.parent;
      return t2.push(e.mount.opts.root), t2.reverse(), PATH.join(...t2);
    }, flagsForNode(e) {
      e &= -2097153, e &= -2049, e &= -32769, e &= -524289, e &= -65537;
      var t2 = 0;
      for (var r in NODEFS.flagsForNodeMap) e & r && (t2 |= NODEFS.flagsForNodeMap[r], e ^= r);
      if (e) throw new FS.ErrnoError(28);
      return t2;
    }, node_ops: { getattr(e) {
      var t2 = NODEFS.realPath(e), r;
      return NODEFS.tryFSOperation(() => r = fs.lstatSync(t2)), NODEFS.isWindows && (r.blksize || (r.blksize = 4096), r.blocks || (r.blocks = (r.size + r.blksize - 1) / r.blksize | 0), r.mode |= (r.mode & 292) >> 2), { dev: r.dev, ino: r.ino, mode: r.mode, nlink: r.nlink, uid: r.uid, gid: r.gid, rdev: r.rdev, size: r.size, atime: r.atime, mtime: r.mtime, ctime: r.ctime, blksize: r.blksize, blocks: r.blocks };
    }, setattr(e, t2) {
      var r = NODEFS.realPath(e);
      NODEFS.tryFSOperation(() => {
        if (t2.mode !== void 0) {
          var a2 = t2.mode;
          NODEFS.isWindows && (a2 &= 384), fs.chmodSync(r, a2), e.mode = t2.mode;
        }
        if (t2.atime || t2.mtime) {
          var s4 = t2.atime && new Date(t2.atime), o4 = t2.mtime && new Date(t2.mtime);
          fs.utimesSync(r, s4, o4);
        }
        t2.size !== void 0 && fs.truncateSync(r, t2.size);
      });
    }, lookup(e, t2) {
      var r = PATH.join2(NODEFS.realPath(e), t2), a2 = NODEFS.getMode(r);
      return NODEFS.createNode(e, t2, a2);
    }, mknod(e, t2, r, a2) {
      var s4 = NODEFS.createNode(e, t2, r, a2), o4 = NODEFS.realPath(s4);
      return NODEFS.tryFSOperation(() => {
        FS.isDir(s4.mode) ? fs.mkdirSync(o4, s4.mode) : fs.writeFileSync(o4, "", { mode: s4.mode });
      }), s4;
    }, rename(e, t2, r) {
      var a2 = NODEFS.realPath(e), s4 = PATH.join2(NODEFS.realPath(t2), r);
      try {
        FS.unlink(s4);
      } catch {
      }
      NODEFS.tryFSOperation(() => fs.renameSync(a2, s4)), e.name = r;
    }, unlink(e, t2) {
      var r = PATH.join2(NODEFS.realPath(e), t2);
      NODEFS.tryFSOperation(() => fs.unlinkSync(r));
    }, rmdir(e, t2) {
      var r = PATH.join2(NODEFS.realPath(e), t2);
      NODEFS.tryFSOperation(() => fs.rmdirSync(r));
    }, readdir(e) {
      var t2 = NODEFS.realPath(e);
      return NODEFS.tryFSOperation(() => fs.readdirSync(t2));
    }, symlink(e, t2, r) {
      var a2 = PATH.join2(NODEFS.realPath(e), t2);
      NODEFS.tryFSOperation(() => fs.symlinkSync(r, a2));
    }, readlink(e) {
      var t2 = NODEFS.realPath(e);
      return NODEFS.tryFSOperation(() => fs.readlinkSync(t2));
    }, statfs(e) {
      var t2 = NODEFS.tryFSOperation(() => fs.statfsSync(e));
      return t2.frsize = t2.bsize, t2;
    } }, stream_ops: { open(e) {
      var t2 = NODEFS.realPath(e.node);
      NODEFS.tryFSOperation(() => {
        FS.isFile(e.node.mode) && (e.shared.refcount = 1, e.nfd = fs.openSync(t2, NODEFS.flagsForNode(e.flags)));
      });
    }, close(e) {
      NODEFS.tryFSOperation(() => {
        FS.isFile(e.node.mode) && e.nfd && --e.shared.refcount === 0 && fs.closeSync(e.nfd);
      });
    }, dup(e) {
      e.shared.refcount++;
    }, read(e, t2, r, a2, s4) {
      return a2 === 0 ? 0 : NODEFS.tryFSOperation(() => fs.readSync(e.nfd, new Int8Array(t2.buffer, r, a2), 0, a2, s4));
    }, write(e, t2, r, a2, s4) {
      return NODEFS.tryFSOperation(() => fs.writeSync(e.nfd, new Int8Array(t2.buffer, r, a2), 0, a2, s4));
    }, llseek(e, t2, r) {
      var a2 = t2;
      if (r === 1 ? a2 += e.position : r === 2 && FS.isFile(e.node.mode) && NODEFS.tryFSOperation(() => {
        var s4 = fs.fstatSync(e.nfd);
        a2 += s4.size;
      }), a2 < 0) throw new FS.ErrnoError(28);
      return a2;
    }, mmap(e, t2, r, a2, s4) {
      if (!FS.isFile(e.node.mode)) throw new FS.ErrnoError(43);
      var o4 = mmapAlloc(t2);
      return NODEFS.stream_ops.read(e, HEAP8, o4, t2, r), { ptr: o4, allocated: true };
    }, msync(e, t2, r, a2, s4) {
      return NODEFS.stream_ops.write(e, t2, 0, a2, r, false), 0;
    } } }, FS = { root: null, mounts: [], devices: {}, streams: [], nextInode: 1, nameTable: null, currentPath: "/", initialized: false, ignorePermissions: true, ErrnoError: class {
      constructor(e) {
        P(this, "name", "ErrnoError");
        this.errno = e;
      }
    }, filesystems: null, syncFSRequests: 0, readFiles: {}, FSStream: class {
      constructor() {
        P(this, "shared", {});
      }
      get object() {
        return this.node;
      }
      set object(e) {
        this.node = e;
      }
      get isRead() {
        return (this.flags & 2097155) !== 1;
      }
      get isWrite() {
        return (this.flags & 2097155) !== 0;
      }
      get isAppend() {
        return this.flags & 1024;
      }
      get flags() {
        return this.shared.flags;
      }
      set flags(e) {
        this.shared.flags = e;
      }
      get position() {
        return this.shared.position;
      }
      set position(e) {
        this.shared.position = e;
      }
    }, FSNode: class {
      constructor(e, t2, r, a2) {
        P(this, "node_ops", {});
        P(this, "stream_ops", {});
        P(this, "readMode", 365);
        P(this, "writeMode", 146);
        P(this, "mounted", null);
        e || (e = this), this.parent = e, this.mount = e.mount, this.id = FS.nextInode++, this.name = t2, this.mode = r, this.rdev = a2, this.atime = this.mtime = this.ctime = Date.now();
      }
      get read() {
        return (this.mode & this.readMode) === this.readMode;
      }
      set read(e) {
        e ? this.mode |= this.readMode : this.mode &= ~this.readMode;
      }
      get write() {
        return (this.mode & this.writeMode) === this.writeMode;
      }
      set write(e) {
        e ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
      }
      get isFolder() {
        return FS.isDir(this.mode);
      }
      get isDevice() {
        return FS.isChrdev(this.mode);
      }
    }, lookupPath(e, t2 = {}) {
      if (!e) return { path: "", node: null };
      t2.follow_mount ?? (t2.follow_mount = true), PATH.isAbs(e) || (e = FS.cwd() + "/" + e);
      e: for (var r = 0; r < 40; r++) {
        for (var a2 = e.split("/").filter((p4) => !!p4 && p4 !== "."), s4 = FS.root, o4 = "/", n3 = 0; n3 < a2.length; n3++) {
          var _3 = n3 === a2.length - 1;
          if (_3 && t2.parent) break;
          if (a2[n3] === "..") {
            o4 = PATH.dirname(o4), s4 = s4.parent;
            continue;
          }
          o4 = PATH.join2(o4, a2[n3]);
          try {
            s4 = FS.lookupNode(s4, a2[n3]);
          } catch (p4) {
            if (p4?.errno === 44 && _3 && t2.noent_okay) return { path: o4 };
            throw p4;
          }
          if (FS.isMountpoint(s4) && (!_3 || t2.follow_mount) && (s4 = s4.mounted.root), FS.isLink(s4.mode) && (!_3 || t2.follow)) {
            if (!s4.node_ops.readlink) throw new FS.ErrnoError(52);
            var l3 = s4.node_ops.readlink(s4);
            PATH.isAbs(l3) || (l3 = PATH.dirname(o4) + "/" + l3), e = l3 + "/" + a2.slice(n3 + 1).join("/");
            continue e;
          }
        }
        return { path: o4, node: s4 };
      }
      throw new FS.ErrnoError(32);
    }, getPath(e) {
      for (var t2; ; ) {
        if (FS.isRoot(e)) {
          var r = e.mount.mountpoint;
          return t2 ? r[r.length - 1] !== "/" ? `${r}/${t2}` : r + t2 : r;
        }
        t2 = t2 ? `${e.name}/${t2}` : e.name, e = e.parent;
      }
    }, hashName(e, t2) {
      for (var r = 0, a2 = 0; a2 < t2.length; a2++) r = (r << 5) - r + t2.charCodeAt(a2) | 0;
      return (e + r >>> 0) % FS.nameTable.length;
    }, hashAddNode(e) {
      var t2 = FS.hashName(e.parent.id, e.name);
      e.name_next = FS.nameTable[t2], FS.nameTable[t2] = e;
    }, hashRemoveNode(e) {
      var t2 = FS.hashName(e.parent.id, e.name);
      if (FS.nameTable[t2] === e) FS.nameTable[t2] = e.name_next;
      else for (var r = FS.nameTable[t2]; r; ) {
        if (r.name_next === e) {
          r.name_next = e.name_next;
          break;
        }
        r = r.name_next;
      }
    }, lookupNode(e, t2) {
      var r = FS.mayLookup(e);
      if (r) throw new FS.ErrnoError(r);
      for (var a2 = FS.hashName(e.id, t2), s4 = FS.nameTable[a2]; s4; s4 = s4.name_next) {
        var o4 = s4.name;
        if (s4.parent.id === e.id && o4 === t2) return s4;
      }
      return FS.lookup(e, t2);
    }, createNode(e, t2, r, a2) {
      var s4 = new FS.FSNode(e, t2, r, a2);
      return FS.hashAddNode(s4), s4;
    }, destroyNode(e) {
      FS.hashRemoveNode(e);
    }, isRoot(e) {
      return e === e.parent;
    }, isMountpoint(e) {
      return !!e.mounted;
    }, isFile(e) {
      return (e & 61440) === 32768;
    }, isDir(e) {
      return (e & 61440) === 16384;
    }, isLink(e) {
      return (e & 61440) === 40960;
    }, isChrdev(e) {
      return (e & 61440) === 8192;
    }, isBlkdev(e) {
      return (e & 61440) === 24576;
    }, isFIFO(e) {
      return (e & 61440) === 4096;
    }, isSocket(e) {
      return (e & 49152) === 49152;
    }, flagsToPermissionString(e) {
      var t2 = ["r", "w", "rw"][e & 3];
      return e & 512 && (t2 += "w"), t2;
    }, nodePermissions(e, t2) {
      return FS.ignorePermissions ? 0 : t2.includes("r") && !(e.mode & 292) || t2.includes("w") && !(e.mode & 146) || t2.includes("x") && !(e.mode & 73) ? 2 : 0;
    }, mayLookup(e) {
      if (!FS.isDir(e.mode)) return 54;
      var t2 = FS.nodePermissions(e, "x");
      return t2 || (e.node_ops.lookup ? 0 : 2);
    }, mayCreate(e, t2) {
      if (!FS.isDir(e.mode)) return 54;
      try {
        var r = FS.lookupNode(e, t2);
        return 20;
      } catch {
      }
      return FS.nodePermissions(e, "wx");
    }, mayDelete(e, t2, r) {
      var a2;
      try {
        a2 = FS.lookupNode(e, t2);
      } catch (o4) {
        return o4.errno;
      }
      var s4 = FS.nodePermissions(e, "wx");
      if (s4) return s4;
      if (r) {
        if (!FS.isDir(a2.mode)) return 54;
        if (FS.isRoot(a2) || FS.getPath(a2) === FS.cwd()) return 10;
      } else if (FS.isDir(a2.mode)) return 31;
      return 0;
    }, mayOpen(e, t2) {
      return e ? FS.isLink(e.mode) ? 32 : FS.isDir(e.mode) && (FS.flagsToPermissionString(t2) !== "r" || t2 & 512) ? 31 : FS.nodePermissions(e, FS.flagsToPermissionString(t2)) : 44;
    }, MAX_OPEN_FDS: 4096, nextfd() {
      for (var e = 0; e <= FS.MAX_OPEN_FDS; e++) if (!FS.streams[e]) return e;
      throw new FS.ErrnoError(33);
    }, getStreamChecked(e) {
      var t2 = FS.getStream(e);
      if (!t2) throw new FS.ErrnoError(8);
      return t2;
    }, getStream: (e) => FS.streams[e], createStream(e, t2 = -1) {
      return e = Object.assign(new FS.FSStream(), e), t2 == -1 && (t2 = FS.nextfd()), e.fd = t2, FS.streams[t2] = e, e;
    }, closeStream(e) {
      FS.streams[e] = null;
    }, dupStream(e, t2 = -1) {
      var r = FS.createStream(e, t2);
      return r.stream_ops?.dup?.(r), r;
    }, chrdev_stream_ops: { open(e) {
      var t2 = FS.getDevice(e.node.rdev);
      e.stream_ops = t2.stream_ops, e.stream_ops.open?.(e);
    }, llseek() {
      throw new FS.ErrnoError(70);
    } }, major: (e) => e >> 8, minor: (e) => e & 255, makedev: (e, t2) => e << 8 | t2, registerDevice(e, t2) {
      FS.devices[e] = { stream_ops: t2 };
    }, getDevice: (e) => FS.devices[e], getMounts(e) {
      for (var t2 = [], r = [e]; r.length; ) {
        var a2 = r.pop();
        t2.push(a2), r.push(...a2.mounts);
      }
      return t2;
    }, syncfs(e, t2) {
      typeof e == "function" && (t2 = e, e = false), FS.syncFSRequests++, FS.syncFSRequests > 1 && err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
      var r = FS.getMounts(FS.root.mount), a2 = 0;
      function s4(n3) {
        return FS.syncFSRequests--, t2(n3);
      }
      function o4(n3) {
        if (n3) return o4.errored ? void 0 : (o4.errored = true, s4(n3));
        ++a2 >= r.length && s4(null);
      }
      r.forEach((n3) => {
        if (!n3.type.syncfs) return o4(null);
        n3.type.syncfs(n3, e, o4);
      });
    }, mount(e, t2, r) {
      var a2 = r === "/", s4 = !r, o4;
      if (a2 && FS.root) throw new FS.ErrnoError(10);
      if (!a2 && !s4) {
        var n3 = FS.lookupPath(r, { follow_mount: false });
        if (r = n3.path, o4 = n3.node, FS.isMountpoint(o4)) throw new FS.ErrnoError(10);
        if (!FS.isDir(o4.mode)) throw new FS.ErrnoError(54);
      }
      var _3 = { type: e, opts: t2, mountpoint: r, mounts: [] }, l3 = e.mount(_3);
      return l3.mount = _3, _3.root = l3, a2 ? FS.root = l3 : o4 && (o4.mounted = _3, o4.mount && o4.mount.mounts.push(_3)), l3;
    }, unmount(e) {
      var t2 = FS.lookupPath(e, { follow_mount: false });
      if (!FS.isMountpoint(t2.node)) throw new FS.ErrnoError(28);
      var r = t2.node, a2 = r.mounted, s4 = FS.getMounts(a2);
      Object.keys(FS.nameTable).forEach((n3) => {
        for (var _3 = FS.nameTable[n3]; _3; ) {
          var l3 = _3.name_next;
          s4.includes(_3.mount) && FS.destroyNode(_3), _3 = l3;
        }
      }), r.mounted = null;
      var o4 = r.mount.mounts.indexOf(a2);
      r.mount.mounts.splice(o4, 1);
    }, lookup(e, t2) {
      return e.node_ops.lookup(e, t2);
    }, mknod(e, t2, r) {
      var a2 = FS.lookupPath(e, { parent: true }), s4 = a2.node, o4 = PATH.basename(e);
      if (!o4 || o4 === "." || o4 === "..") throw new FS.ErrnoError(28);
      var n3 = FS.mayCreate(s4, o4);
      if (n3) throw new FS.ErrnoError(n3);
      if (!s4.node_ops.mknod) throw new FS.ErrnoError(63);
      return s4.node_ops.mknod(s4, o4, t2, r);
    }, statfs(e) {
      var t2 = { bsize: 4096, frsize: 4096, blocks: 1e6, bfree: 5e5, bavail: 5e5, files: FS.nextInode, ffree: FS.nextInode - 1, fsid: 42, flags: 2, namelen: 255 }, r = FS.lookupPath(e, { follow: true }).node;
      return r?.node_ops.statfs && Object.assign(t2, r.node_ops.statfs(r.mount.opts.root)), t2;
    }, create(e, t2 = 438) {
      return t2 &= 4095, t2 |= 32768, FS.mknod(e, t2, 0);
    }, mkdir(e, t2 = 511) {
      return t2 &= 1023, t2 |= 16384, FS.mknod(e, t2, 0);
    }, mkdirTree(e, t2) {
      for (var r = e.split("/"), a2 = "", s4 = 0; s4 < r.length; ++s4) if (r[s4]) {
        a2 += "/" + r[s4];
        try {
          FS.mkdir(a2, t2);
        } catch (o4) {
          if (o4.errno != 20) throw o4;
        }
      }
    }, mkdev(e, t2, r) {
      return typeof r > "u" && (r = t2, t2 = 438), t2 |= 8192, FS.mknod(e, t2, r);
    }, symlink(e, t2) {
      if (!PATH_FS.resolve(e)) throw new FS.ErrnoError(44);
      var r = FS.lookupPath(t2, { parent: true }), a2 = r.node;
      if (!a2) throw new FS.ErrnoError(44);
      var s4 = PATH.basename(t2), o4 = FS.mayCreate(a2, s4);
      if (o4) throw new FS.ErrnoError(o4);
      if (!a2.node_ops.symlink) throw new FS.ErrnoError(63);
      return a2.node_ops.symlink(a2, s4, e);
    }, rename(e, t2) {
      var r = PATH.dirname(e), a2 = PATH.dirname(t2), s4 = PATH.basename(e), o4 = PATH.basename(t2), n3, _3, l3;
      if (n3 = FS.lookupPath(e, { parent: true }), _3 = n3.node, n3 = FS.lookupPath(t2, { parent: true }), l3 = n3.node, !_3 || !l3) throw new FS.ErrnoError(44);
      if (_3.mount !== l3.mount) throw new FS.ErrnoError(75);
      var p4 = FS.lookupNode(_3, s4), m4 = PATH_FS.relative(e, a2);
      if (m4.charAt(0) !== ".") throw new FS.ErrnoError(28);
      if (m4 = PATH_FS.relative(t2, r), m4.charAt(0) !== ".") throw new FS.ErrnoError(55);
      var d2;
      try {
        d2 = FS.lookupNode(l3, o4);
      } catch {
      }
      if (p4 !== d2) {
        var g5 = FS.isDir(p4.mode), u2 = FS.mayDelete(_3, s4, g5);
        if (u2) throw new FS.ErrnoError(u2);
        if (u2 = d2 ? FS.mayDelete(l3, o4, g5) : FS.mayCreate(l3, o4), u2) throw new FS.ErrnoError(u2);
        if (!_3.node_ops.rename) throw new FS.ErrnoError(63);
        if (FS.isMountpoint(p4) || d2 && FS.isMountpoint(d2)) throw new FS.ErrnoError(10);
        if (l3 !== _3 && (u2 = FS.nodePermissions(_3, "w"), u2)) throw new FS.ErrnoError(u2);
        FS.hashRemoveNode(p4);
        try {
          _3.node_ops.rename(p4, l3, o4), p4.parent = l3;
        } catch (f3) {
          throw f3;
        } finally {
          FS.hashAddNode(p4);
        }
      }
    }, rmdir(e) {
      var t2 = FS.lookupPath(e, { parent: true }), r = t2.node, a2 = PATH.basename(e), s4 = FS.lookupNode(r, a2), o4 = FS.mayDelete(r, a2, true);
      if (o4) throw new FS.ErrnoError(o4);
      if (!r.node_ops.rmdir) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(s4)) throw new FS.ErrnoError(10);
      r.node_ops.rmdir(r, a2), FS.destroyNode(s4);
    }, readdir(e) {
      var t2 = FS.lookupPath(e, { follow: true }), r = t2.node;
      if (!r.node_ops.readdir) throw new FS.ErrnoError(54);
      return r.node_ops.readdir(r);
    }, unlink(e) {
      var t2 = FS.lookupPath(e, { parent: true }), r = t2.node;
      if (!r) throw new FS.ErrnoError(44);
      var a2 = PATH.basename(e), s4 = FS.lookupNode(r, a2), o4 = FS.mayDelete(r, a2, false);
      if (o4) throw new FS.ErrnoError(o4);
      if (!r.node_ops.unlink) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(s4)) throw new FS.ErrnoError(10);
      r.node_ops.unlink(r, a2), FS.destroyNode(s4);
    }, readlink(e) {
      var t2 = FS.lookupPath(e), r = t2.node;
      if (!r) throw new FS.ErrnoError(44);
      if (!r.node_ops.readlink) throw new FS.ErrnoError(28);
      return r.node_ops.readlink(r);
    }, stat(e, t2) {
      var r = FS.lookupPath(e, { follow: !t2 }), a2 = r.node;
      if (!a2) throw new FS.ErrnoError(44);
      if (!a2.node_ops.getattr) throw new FS.ErrnoError(63);
      return a2.node_ops.getattr(a2);
    }, lstat(e) {
      return FS.stat(e, true);
    }, chmod(e, t2, r) {
      var a2;
      if (typeof e == "string") {
        var s4 = FS.lookupPath(e, { follow: !r });
        a2 = s4.node;
      } else a2 = e;
      if (!a2.node_ops.setattr) throw new FS.ErrnoError(63);
      a2.node_ops.setattr(a2, { mode: t2 & 4095 | a2.mode & -4096, ctime: Date.now() });
    }, lchmod(e, t2) {
      FS.chmod(e, t2, true);
    }, fchmod(e, t2) {
      var r = FS.getStreamChecked(e);
      FS.chmod(r.node, t2);
    }, chown(e, t2, r, a2) {
      var s4;
      if (typeof e == "string") {
        var o4 = FS.lookupPath(e, { follow: !a2 });
        s4 = o4.node;
      } else s4 = e;
      if (!s4.node_ops.setattr) throw new FS.ErrnoError(63);
      s4.node_ops.setattr(s4, { timestamp: Date.now() });
    }, lchown(e, t2, r) {
      FS.chown(e, t2, r, true);
    }, fchown(e, t2, r) {
      var a2 = FS.getStreamChecked(e);
      FS.chown(a2.node, t2, r);
    }, truncate(e, t2) {
      if (t2 < 0) throw new FS.ErrnoError(28);
      var r;
      if (typeof e == "string") {
        var a2 = FS.lookupPath(e, { follow: true });
        r = a2.node;
      } else r = e;
      if (!r.node_ops.setattr) throw new FS.ErrnoError(63);
      if (FS.isDir(r.mode)) throw new FS.ErrnoError(31);
      if (!FS.isFile(r.mode)) throw new FS.ErrnoError(28);
      var s4 = FS.nodePermissions(r, "w");
      if (s4) throw new FS.ErrnoError(s4);
      r.node_ops.setattr(r, { size: t2, timestamp: Date.now() });
    }, ftruncate(e, t2) {
      var r = FS.getStreamChecked(e);
      if (!(r.flags & 2097155)) throw new FS.ErrnoError(28);
      FS.truncate(r.node, t2);
    }, utime(e, t2, r) {
      var a2 = FS.lookupPath(e, { follow: true }), s4 = a2.node;
      s4.node_ops.setattr(s4, { atime: t2, mtime: r });
    }, open(e, t2, r = 438) {
      if (e === "") throw new FS.ErrnoError(44);
      t2 = typeof t2 == "string" ? FS_modeStringToFlags(t2) : t2, t2 & 64 ? r = r & 4095 | 32768 : r = 0;
      var a2;
      if (typeof e == "object") a2 = e;
      else {
        var s4 = FS.lookupPath(e, { follow: !(t2 & 131072), noent_okay: true });
        a2 = s4.node, e = s4.path;
      }
      var o4 = false;
      if (t2 & 64) if (a2) {
        if (t2 & 128) throw new FS.ErrnoError(20);
      } else a2 = FS.mknod(e, r, 0), o4 = true;
      if (!a2) throw new FS.ErrnoError(44);
      if (FS.isChrdev(a2.mode) && (t2 &= -513), t2 & 65536 && !FS.isDir(a2.mode)) throw new FS.ErrnoError(54);
      if (!o4) {
        var n3 = FS.mayOpen(a2, t2);
        if (n3) throw new FS.ErrnoError(n3);
      }
      t2 & 512 && !o4 && FS.truncate(a2, 0), t2 &= -131713;
      var _3 = FS.createStream({ node: a2, path: FS.getPath(a2), flags: t2, seekable: true, position: 0, stream_ops: a2.stream_ops, ungotten: [], error: false });
      return _3.stream_ops.open && _3.stream_ops.open(_3), Module.logReadFiles && !(t2 & 1) && (e in FS.readFiles || (FS.readFiles[e] = 1)), _3;
    }, close(e) {
      if (FS.isClosed(e)) throw new FS.ErrnoError(8);
      e.getdents && (e.getdents = null);
      try {
        e.stream_ops.close && e.stream_ops.close(e);
      } catch (t2) {
        throw t2;
      } finally {
        FS.closeStream(e.fd);
      }
      e.fd = null;
    }, isClosed(e) {
      return e.fd === null;
    }, llseek(e, t2, r) {
      if (FS.isClosed(e)) throw new FS.ErrnoError(8);
      if (!e.seekable || !e.stream_ops.llseek) throw new FS.ErrnoError(70);
      if (r != 0 && r != 1 && r != 2) throw new FS.ErrnoError(28);
      return e.position = e.stream_ops.llseek(e, t2, r), e.ungotten = [], e.position;
    }, read(e, t2, r, a2, s4) {
      if (a2 < 0 || s4 < 0) throw new FS.ErrnoError(28);
      if (FS.isClosed(e)) throw new FS.ErrnoError(8);
      if ((e.flags & 2097155) === 1) throw new FS.ErrnoError(8);
      if (FS.isDir(e.node.mode)) throw new FS.ErrnoError(31);
      if (!e.stream_ops.read) throw new FS.ErrnoError(28);
      var o4 = typeof s4 < "u";
      if (!o4) s4 = e.position;
      else if (!e.seekable) throw new FS.ErrnoError(70);
      var n3 = e.stream_ops.read(e, t2, r, a2, s4);
      return o4 || (e.position += n3), n3;
    }, write(e, t2, r, a2, s4, o4) {
      if (a2 < 0 || s4 < 0) throw new FS.ErrnoError(28);
      if (FS.isClosed(e)) throw new FS.ErrnoError(8);
      if (!(e.flags & 2097155)) throw new FS.ErrnoError(8);
      if (FS.isDir(e.node.mode)) throw new FS.ErrnoError(31);
      if (!e.stream_ops.write) throw new FS.ErrnoError(28);
      e.seekable && e.flags & 1024 && FS.llseek(e, 0, 2);
      var n3 = typeof s4 < "u";
      if (!n3) s4 = e.position;
      else if (!e.seekable) throw new FS.ErrnoError(70);
      var _3 = e.stream_ops.write(e, t2, r, a2, s4, o4);
      return n3 || (e.position += _3), _3;
    }, allocate(e, t2, r) {
      if (FS.isClosed(e)) throw new FS.ErrnoError(8);
      if (t2 < 0 || r <= 0) throw new FS.ErrnoError(28);
      if (!(e.flags & 2097155)) throw new FS.ErrnoError(8);
      if (!FS.isFile(e.node.mode) && !FS.isDir(e.node.mode)) throw new FS.ErrnoError(43);
      if (!e.stream_ops.allocate) throw new FS.ErrnoError(138);
      e.stream_ops.allocate(e, t2, r);
    }, mmap(e, t2, r, a2, s4) {
      if (a2 & 2 && !(s4 & 2) && (e.flags & 2097155) !== 2) throw new FS.ErrnoError(2);
      if ((e.flags & 2097155) === 1) throw new FS.ErrnoError(2);
      if (!e.stream_ops.mmap) throw new FS.ErrnoError(43);
      if (!t2) throw new FS.ErrnoError(28);
      return e.stream_ops.mmap(e, t2, r, a2, s4);
    }, msync(e, t2, r, a2, s4) {
      return e.stream_ops.msync ? e.stream_ops.msync(e, t2, r, a2, s4) : 0;
    }, ioctl(e, t2, r) {
      if (!e.stream_ops.ioctl) throw new FS.ErrnoError(59);
      return e.stream_ops.ioctl(e, t2, r);
    }, readFile(e, t2 = {}) {
      if (t2.flags = t2.flags || 0, t2.encoding = t2.encoding || "binary", t2.encoding !== "utf8" && t2.encoding !== "binary") throw new Error(`Invalid encoding type "${t2.encoding}"`);
      var r, a2 = FS.open(e, t2.flags), s4 = FS.stat(e), o4 = s4.size, n3 = new Uint8Array(o4);
      return FS.read(a2, n3, 0, o4, 0), t2.encoding === "utf8" ? r = UTF8ArrayToString(n3) : t2.encoding === "binary" && (r = n3), FS.close(a2), r;
    }, writeFile(e, t2, r = {}) {
      r.flags = r.flags || 577;
      var a2 = FS.open(e, r.flags, r.mode);
      if (typeof t2 == "string") {
        var s4 = new Uint8Array(lengthBytesUTF8(t2) + 1), o4 = stringToUTF8Array(t2, s4, 0, s4.length);
        FS.write(a2, s4, 0, o4, void 0, r.canOwn);
      } else if (ArrayBuffer.isView(t2)) FS.write(a2, t2, 0, t2.byteLength, void 0, r.canOwn);
      else throw new Error("Unsupported data type");
      FS.close(a2);
    }, cwd: () => FS.currentPath, chdir(e) {
      var t2 = FS.lookupPath(e, { follow: true });
      if (t2.node === null) throw new FS.ErrnoError(44);
      if (!FS.isDir(t2.node.mode)) throw new FS.ErrnoError(54);
      var r = FS.nodePermissions(t2.node, "x");
      if (r) throw new FS.ErrnoError(r);
      FS.currentPath = t2.path;
    }, createDefaultDirectories() {
      FS.mkdir("/tmp"), FS.mkdir("/home"), FS.mkdir("/home/web_user");
    }, createDefaultDevices() {
      FS.mkdir("/dev"), FS.registerDevice(FS.makedev(1, 3), { read: () => 0, write: (a2, s4, o4, n3, _3) => n3, llseek: () => 0 }), FS.mkdev("/dev/null", FS.makedev(1, 3)), TTY.register(FS.makedev(5, 0), TTY.default_tty_ops), TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops), FS.mkdev("/dev/tty", FS.makedev(5, 0)), FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var e = new Uint8Array(1024), t2 = 0, r = () => (t2 === 0 && (t2 = randomFill(e).byteLength), e[--t2]);
      FS.createDevice("/dev", "random", r), FS.createDevice("/dev", "urandom", r), FS.mkdir("/dev/shm"), FS.mkdir("/dev/shm/tmp");
    }, createSpecialDirectories() {
      FS.mkdir("/proc");
      var e = FS.mkdir("/proc/self");
      FS.mkdir("/proc/self/fd"), FS.mount({ mount() {
        var t2 = FS.createNode(e, "fd", 16895, 73);
        return t2.stream_ops = { llseek: MEMFS.stream_ops.llseek }, t2.node_ops = { lookup(r, a2) {
          var s4 = +a2, o4 = FS.getStreamChecked(s4), n3 = { parent: null, mount: { mountpoint: "fake" }, node_ops: { readlink: () => o4.path }, id: s4 + 1 };
          return n3.parent = n3, n3;
        }, readdir() {
          return Array.from(FS.streams.entries()).filter(([r, a2]) => a2).map(([r, a2]) => r.toString());
        } }, t2;
      } }, {}, "/proc/self/fd");
    }, createStandardStreams(e, t2, r) {
      e ? FS.createDevice("/dev", "stdin", e) : FS.symlink("/dev/tty", "/dev/stdin"), t2 ? FS.createDevice("/dev", "stdout", null, t2) : FS.symlink("/dev/tty", "/dev/stdout"), r ? FS.createDevice("/dev", "stderr", null, r) : FS.symlink("/dev/tty1", "/dev/stderr");
      var a2 = FS.open("/dev/stdin", 0), s4 = FS.open("/dev/stdout", 1), o4 = FS.open("/dev/stderr", 1);
    }, staticInit() {
      FS.nameTable = new Array(4096), FS.mount(MEMFS, {}, "/"), FS.createDefaultDirectories(), FS.createDefaultDevices(), FS.createSpecialDirectories(), FS.filesystems = { MEMFS, IDBFS, NODEFS };
    }, init(e, t2, r) {
      FS.initialized = true, e ?? (e = Module.stdin), t2 ?? (t2 = Module.stdout), r ?? (r = Module.stderr), FS.createStandardStreams(e, t2, r);
    }, quit() {
      FS.initialized = false, _fflush(0);
      for (var e = 0; e < FS.streams.length; e++) {
        var t2 = FS.streams[e];
        t2 && FS.close(t2);
      }
    }, findObject(e, t2) {
      var r = FS.analyzePath(e, t2);
      return r.exists ? r.object : null;
    }, analyzePath(e, t2) {
      try {
        var r = FS.lookupPath(e, { follow: !t2 });
        e = r.path;
      } catch {
      }
      var a2 = { isRoot: false, exists: false, error: 0, name: null, path: null, object: null, parentExists: false, parentPath: null, parentObject: null };
      try {
        var r = FS.lookupPath(e, { parent: true });
        a2.parentExists = true, a2.parentPath = r.path, a2.parentObject = r.node, a2.name = PATH.basename(e), r = FS.lookupPath(e, { follow: !t2 }), a2.exists = true, a2.path = r.path, a2.object = r.node, a2.name = r.node.name, a2.isRoot = r.path === "/";
      } catch (s4) {
        a2.error = s4.errno;
      }
      return a2;
    }, createPath(e, t2, r, a2) {
      e = typeof e == "string" ? e : FS.getPath(e);
      for (var s4 = t2.split("/").reverse(); s4.length; ) {
        var o4 = s4.pop();
        if (o4) {
          var n3 = PATH.join2(e, o4);
          try {
            FS.mkdir(n3);
          } catch {
          }
          e = n3;
        }
      }
      return n3;
    }, createFile(e, t2, r, a2, s4) {
      var o4 = PATH.join2(typeof e == "string" ? e : FS.getPath(e), t2), n3 = FS_getMode(a2, s4);
      return FS.create(o4, n3);
    }, createDataFile(e, t2, r, a2, s4, o4) {
      var n3 = t2;
      e && (e = typeof e == "string" ? e : FS.getPath(e), n3 = t2 ? PATH.join2(e, t2) : e);
      var _3 = FS_getMode(a2, s4), l3 = FS.create(n3, _3);
      if (r) {
        if (typeof r == "string") {
          for (var p4 = new Array(r.length), m4 = 0, d2 = r.length; m4 < d2; ++m4) p4[m4] = r.charCodeAt(m4);
          r = p4;
        }
        FS.chmod(l3, _3 | 146);
        var g5 = FS.open(l3, 577);
        FS.write(g5, r, 0, r.length, 0, o4), FS.close(g5), FS.chmod(l3, _3);
      }
    }, createDevice(e, t2, r, a2) {
      var _3;
      var s4 = PATH.join2(typeof e == "string" ? e : FS.getPath(e), t2), o4 = FS_getMode(!!r, !!a2);
      (_3 = FS.createDevice).major ?? (_3.major = 64);
      var n3 = FS.makedev(FS.createDevice.major++, 0);
      return FS.registerDevice(n3, { open(l3) {
        l3.seekable = false;
      }, close(l3) {
        a2?.buffer?.length && a2(10);
      }, read(l3, p4, m4, d2, g5) {
        for (var u2 = 0, f3 = 0; f3 < d2; f3++) {
          var c2;
          try {
            c2 = r();
          } catch {
            throw new FS.ErrnoError(29);
          }
          if (c2 === void 0 && u2 === 0) throw new FS.ErrnoError(6);
          if (c2 == null) break;
          u2++, p4[m4 + f3] = c2;
        }
        return u2 && (l3.node.atime = Date.now()), u2;
      }, write(l3, p4, m4, d2, g5) {
        for (var u2 = 0; u2 < d2; u2++) try {
          a2(p4[m4 + u2]);
        } catch {
          throw new FS.ErrnoError(29);
        }
        return d2 && (l3.node.mtime = l3.node.ctime = Date.now()), u2;
      } }), FS.mkdev(s4, o4, n3);
    }, forceLoadFile(e) {
      if (e.isDevice || e.isFolder || e.link || e.contents) return true;
      if (typeof XMLHttpRequest < "u") throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
      try {
        e.contents = readBinary(e.url), e.usedBytes = e.contents.length;
      } catch {
        throw new FS.ErrnoError(29);
      }
    }, createLazyFile(e, t2, r, a2, s4) {
      class o4 {
        constructor() {
          P(this, "lengthKnown", false);
          P(this, "chunks", []);
        }
        get(u2) {
          if (!(u2 > this.length - 1 || u2 < 0)) {
            var f3 = u2 % this.chunkSize, c2 = u2 / this.chunkSize | 0;
            return this.getter(c2)[f3];
          }
        }
        setDataGetter(u2) {
          this.getter = u2;
        }
        cacheLength() {
          var u2 = new XMLHttpRequest();
          if (u2.open("HEAD", r, false), u2.send(null), !(u2.status >= 200 && u2.status < 300 || u2.status === 304)) throw new Error("Couldn't load " + r + ". Status: " + u2.status);
          var f3 = Number(u2.getResponseHeader("Content-length")), c2, w4 = (c2 = u2.getResponseHeader("Accept-Ranges")) && c2 === "bytes", x6 = (c2 = u2.getResponseHeader("Content-Encoding")) && c2 === "gzip", S3 = 1024 * 1024;
          w4 || (S3 = f3);
          var v3 = (E2, y4) => {
            if (E2 > y4) throw new Error("invalid range (" + E2 + ", " + y4 + ") or no bytes requested!");
            if (y4 > f3 - 1) throw new Error("only " + f3 + " bytes available! programmer error!");
            var F4 = new XMLHttpRequest();
            if (F4.open("GET", r, false), f3 !== S3 && F4.setRequestHeader("Range", "bytes=" + E2 + "-" + y4), F4.responseType = "arraybuffer", F4.overrideMimeType && F4.overrideMimeType("text/plain; charset=x-user-defined"), F4.send(null), !(F4.status >= 200 && F4.status < 300 || F4.status === 304)) throw new Error("Couldn't load " + r + ". Status: " + F4.status);
            return F4.response !== void 0 ? new Uint8Array(F4.response || []) : intArrayFromString(F4.responseText || "", true);
          }, b3 = this;
          b3.setDataGetter((E2) => {
            var y4 = E2 * S3, F4 = (E2 + 1) * S3 - 1;
            if (F4 = Math.min(F4, f3 - 1), typeof b3.chunks[E2] > "u" && (b3.chunks[E2] = v3(y4, F4)), typeof b3.chunks[E2] > "u") throw new Error("doXHR failed!");
            return b3.chunks[E2];
          }), (x6 || !f3) && (S3 = f3 = 1, f3 = this.getter(0).length, S3 = f3, out("LazyFiles on gzip forces download of the whole file when length is accessed")), this._length = f3, this._chunkSize = S3, this.lengthKnown = true;
        }
        get length() {
          return this.lengthKnown || this.cacheLength(), this._length;
        }
        get chunkSize() {
          return this.lengthKnown || this.cacheLength(), this._chunkSize;
        }
      }
      if (typeof XMLHttpRequest < "u") {
        if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
        var n3 = new o4(), _3 = { isDevice: false, contents: n3 };
      } else var _3 = { isDevice: false, url: r };
      var l3 = FS.createFile(e, t2, _3, a2, s4);
      _3.contents ? l3.contents = _3.contents : _3.url && (l3.contents = null, l3.url = _3.url), Object.defineProperties(l3, { usedBytes: { get: function() {
        return this.contents.length;
      } } });
      var p4 = {}, m4 = Object.keys(l3.stream_ops);
      m4.forEach((g5) => {
        var u2 = l3.stream_ops[g5];
        p4[g5] = (...f3) => (FS.forceLoadFile(l3), u2(...f3));
      });
      function d2(g5, u2, f3, c2, w4) {
        var x6 = g5.node.contents;
        if (w4 >= x6.length) return 0;
        var S3 = Math.min(x6.length - w4, c2);
        if (x6.slice) for (var v3 = 0; v3 < S3; v3++) u2[f3 + v3] = x6[w4 + v3];
        else for (var v3 = 0; v3 < S3; v3++) u2[f3 + v3] = x6.get(w4 + v3);
        return S3;
      }
      return p4.read = (g5, u2, f3, c2, w4) => (FS.forceLoadFile(l3), d2(g5, u2, f3, c2, w4)), p4.mmap = (g5, u2, f3, c2, w4) => {
        FS.forceLoadFile(l3);
        var x6 = mmapAlloc(u2);
        if (!x6) throw new FS.ErrnoError(48);
        return d2(g5, HEAP8, x6, u2, f3), { ptr: x6, allocated: true };
      }, l3.stream_ops = p4, l3;
    } }, SYSCALLS = { DEFAULT_POLLMASK: 5, calculateAt(e, t2, r) {
      if (PATH.isAbs(t2)) return t2;
      var a2;
      if (e === -100) a2 = FS.cwd();
      else {
        var s4 = SYSCALLS.getStreamFromFD(e);
        a2 = s4.path;
      }
      if (t2.length == 0) {
        if (!r) throw new FS.ErrnoError(44);
        return a2;
      }
      return a2 + "/" + t2;
    }, doStat(e, t2, r) {
      var a2 = e(t2);
      HEAP32[r >> 2] = a2.dev, HEAP32[r + 4 >> 2] = a2.mode, HEAPU32[r + 8 >> 2] = a2.nlink, HEAP32[r + 12 >> 2] = a2.uid, HEAP32[r + 16 >> 2] = a2.gid, HEAP32[r + 20 >> 2] = a2.rdev, HEAP64[r + 24 >> 3] = BigInt(a2.size), HEAP32[r + 32 >> 2] = 4096, HEAP32[r + 36 >> 2] = a2.blocks;
      var s4 = a2.atime.getTime(), o4 = a2.mtime.getTime(), n3 = a2.ctime.getTime();
      return HEAP64[r + 40 >> 3] = BigInt(Math.floor(s4 / 1e3)), HEAPU32[r + 48 >> 2] = s4 % 1e3 * 1e3 * 1e3, HEAP64[r + 56 >> 3] = BigInt(Math.floor(o4 / 1e3)), HEAPU32[r + 64 >> 2] = o4 % 1e3 * 1e3 * 1e3, HEAP64[r + 72 >> 3] = BigInt(Math.floor(n3 / 1e3)), HEAPU32[r + 80 >> 2] = n3 % 1e3 * 1e3 * 1e3, HEAP64[r + 88 >> 3] = BigInt(a2.ino), 0;
    }, doMsync(e, t2, r, a2, s4) {
      if (!FS.isFile(t2.node.mode)) throw new FS.ErrnoError(43);
      if (a2 & 2) return 0;
      var o4 = HEAPU8.slice(e, e + r);
      FS.msync(t2, o4, s4, r, a2);
    }, getStreamFromFD(e) {
      var t2 = FS.getStreamChecked(e);
      return t2;
    }, varargs: void 0, getStr(e) {
      var t2 = UTF8ToString(e);
      return t2;
    } }, ___syscall__newselect = function(e, t2, r, a2, s4) {
      try {
        for (var o4 = 0, n3 = t2 ? HEAP32[t2 >> 2] : 0, _3 = t2 ? HEAP32[t2 + 4 >> 2] : 0, l3 = r ? HEAP32[r >> 2] : 0, p4 = r ? HEAP32[r + 4 >> 2] : 0, m4 = a2 ? HEAP32[a2 >> 2] : 0, d2 = a2 ? HEAP32[a2 + 4 >> 2] : 0, g5 = 0, u2 = 0, f3 = 0, c2 = 0, w4 = 0, x6 = 0, S3 = (t2 ? HEAP32[t2 >> 2] : 0) | (r ? HEAP32[r >> 2] : 0) | (a2 ? HEAP32[a2 >> 2] : 0), v3 = (t2 ? HEAP32[t2 + 4 >> 2] : 0) | (r ? HEAP32[r + 4 >> 2] : 0) | (a2 ? HEAP32[a2 + 4 >> 2] : 0), b3 = (H4, A2, D4, T5) => H4 < 32 ? A2 & T5 : D4 & T5, E2 = 0; E2 < e; E2++) {
          var y4 = 1 << E2 % 32;
          if (b3(E2, S3, v3, y4)) {
            var F4 = SYSCALLS.getStreamFromFD(E2), R3 = SYSCALLS.DEFAULT_POLLMASK;
            if (F4.stream_ops.poll) {
              var U3 = -1;
              if (s4) {
                var ee2 = t2 ? HEAP32[s4 >> 2] : 0, N2 = t2 ? HEAP32[s4 + 4 >> 2] : 0;
                U3 = (ee2 + N2 / 1e6) * 1e3;
              }
              R3 = F4.stream_ops.poll(F4, U3);
            }
            R3 & 1 && b3(E2, n3, _3, y4) && (E2 < 32 ? g5 = g5 | y4 : u2 = u2 | y4, o4++), R3 & 4 && b3(E2, l3, p4, y4) && (E2 < 32 ? f3 = f3 | y4 : c2 = c2 | y4, o4++), R3 & 2 && b3(E2, m4, d2, y4) && (E2 < 32 ? w4 = w4 | y4 : x6 = x6 | y4, o4++);
          }
        }
        return t2 && (HEAP32[t2 >> 2] = g5, HEAP32[t2 + 4 >> 2] = u2), r && (HEAP32[r >> 2] = f3, HEAP32[r + 4 >> 2] = c2), a2 && (HEAP32[a2 >> 2] = w4, HEAP32[a2 + 4 >> 2] = x6), o4;
      } catch (H4) {
        if (typeof FS > "u" || H4.name !== "ErrnoError") throw H4;
        return -H4.errno;
      }
    };
    ___syscall__newselect.sig = "iipppp";
    var SOCKFS = { websocketArgs: {}, callbacks: {}, on(e, t2) {
      SOCKFS.callbacks[e] = t2;
    }, emit(e, t2) {
      SOCKFS.callbacks[e]?.(t2);
    }, mount(e) {
      return SOCKFS.websocketArgs = Module.websocket || {}, (Module.websocket ?? (Module.websocket = {})).on = SOCKFS.on, FS.createNode(null, "/", 16895, 0);
    }, createSocket(e, t2, r) {
      t2 &= -526337;
      var a2 = t2 == 1;
      if (a2 && r && r != 6) throw new FS.ErrnoError(66);
      var s4 = { family: e, type: t2, protocol: r, server: null, error: null, peers: {}, pending: [], recv_queue: [], sock_ops: SOCKFS.websocket_sock_ops }, o4 = SOCKFS.nextname(), n3 = FS.createNode(SOCKFS.root, o4, 49152, 0);
      n3.sock = s4;
      var _3 = FS.createStream({ path: o4, node: n3, flags: 2, seekable: false, stream_ops: SOCKFS.stream_ops });
      return s4.stream = _3, s4;
    }, getSocket(e) {
      var t2 = FS.getStream(e);
      return !t2 || !FS.isSocket(t2.node.mode) ? null : t2.node.sock;
    }, stream_ops: { poll(e) {
      var t2 = e.node.sock;
      return t2.sock_ops.poll(t2);
    }, ioctl(e, t2, r) {
      var a2 = e.node.sock;
      return a2.sock_ops.ioctl(a2, t2, r);
    }, read(e, t2, r, a2, s4) {
      var o4 = e.node.sock, n3 = o4.sock_ops.recvmsg(o4, a2);
      return n3 ? (t2.set(n3.buffer, r), n3.buffer.length) : 0;
    }, write(e, t2, r, a2, s4) {
      var o4 = e.node.sock;
      return o4.sock_ops.sendmsg(o4, t2, r, a2);
    }, close(e) {
      var t2 = e.node.sock;
      t2.sock_ops.close(t2);
    } }, nextname() {
      return SOCKFS.nextname.current || (SOCKFS.nextname.current = 0), `socket[${SOCKFS.nextname.current++}]`;
    }, websocket_sock_ops: { createPeer(e, t2, r) {
      var a2;
      if (typeof t2 == "object" && (a2 = t2, t2 = null, r = null), a2) if (a2._socket) t2 = a2._socket.remoteAddress, r = a2._socket.remotePort;
      else {
        var s4 = /ws[s]?:\/\/([^:]+):(\d+)/.exec(a2.url);
        if (!s4) throw new Error("WebSocket URL must be in the format ws(s)://address:port");
        t2 = s4[1], r = parseInt(s4[2], 10);
      }
      else try {
        var o4 = "ws:#".replace("#", "//"), n3 = "binary", _3 = void 0;
        if (SOCKFS.websocketArgs.url && (o4 = SOCKFS.websocketArgs.url), SOCKFS.websocketArgs.subprotocol ? n3 = SOCKFS.websocketArgs.subprotocol : SOCKFS.websocketArgs.subprotocol === null && (n3 = "null"), o4 === "ws://" || o4 === "wss://") {
          var l3 = t2.split("/");
          o4 = o4 + l3[0] + ":" + r + "/" + l3.slice(1).join("/");
        }
        n3 !== "null" && (n3 = n3.replace(/^ +| +$/g, "").split(/ *, */), _3 = n3);
        var p4;
        ENVIRONMENT_IS_NODE ? p4 = require("ws") : p4 = WebSocket, a2 = new p4(o4, _3), a2.binaryType = "arraybuffer";
      } catch {
        throw new FS.ErrnoError(23);
      }
      var m4 = { addr: t2, port: r, socket: a2, msg_send_queue: [] };
      return SOCKFS.websocket_sock_ops.addPeer(e, m4), SOCKFS.websocket_sock_ops.handlePeerEvents(e, m4), e.type === 2 && typeof e.sport < "u" && m4.msg_send_queue.push(new Uint8Array([255, 255, 255, 255, 112, 111, 114, 116, (e.sport & 65280) >> 8, e.sport & 255])), m4;
    }, getPeer(e, t2, r) {
      return e.peers[t2 + ":" + r];
    }, addPeer(e, t2) {
      e.peers[t2.addr + ":" + t2.port] = t2;
    }, removePeer(e, t2) {
      delete e.peers[t2.addr + ":" + t2.port];
    }, handlePeerEvents(e, t2) {
      var r = true, a2 = function() {
        e.connecting = false, SOCKFS.emit("open", e.stream.fd);
        try {
          for (var o4 = t2.msg_send_queue.shift(); o4; ) t2.socket.send(o4), o4 = t2.msg_send_queue.shift();
        } catch {
          t2.socket.close();
        }
      };
      function s4(o4) {
        if (typeof o4 == "string") {
          var n3 = new TextEncoder();
          o4 = n3.encode(o4);
        } else {
          if (assert(o4.byteLength !== void 0), o4.byteLength == 0) return;
          o4 = new Uint8Array(o4);
        }
        var _3 = r;
        if (r = false, _3 && o4.length === 10 && o4[0] === 255 && o4[1] === 255 && o4[2] === 255 && o4[3] === 255 && o4[4] === 112 && o4[5] === 111 && o4[6] === 114 && o4[7] === 116) {
          var l3 = o4[8] << 8 | o4[9];
          SOCKFS.websocket_sock_ops.removePeer(e, t2), t2.port = l3, SOCKFS.websocket_sock_ops.addPeer(e, t2);
          return;
        }
        e.recv_queue.push({ addr: t2.addr, port: t2.port, data: o4 }), SOCKFS.emit("message", e.stream.fd);
      }
      ENVIRONMENT_IS_NODE ? (t2.socket.on("open", a2), t2.socket.on("message", function(o4, n3) {
        n3 && s4(new Uint8Array(o4).buffer);
      }), t2.socket.on("close", function() {
        SOCKFS.emit("close", e.stream.fd);
      }), t2.socket.on("error", function(o4) {
        e.error = 14, SOCKFS.emit("error", [e.stream.fd, e.error, "ECONNREFUSED: Connection refused"]);
      })) : (t2.socket.onopen = a2, t2.socket.onclose = function() {
        SOCKFS.emit("close", e.stream.fd);
      }, t2.socket.onmessage = function(n3) {
        s4(n3.data);
      }, t2.socket.onerror = function(o4) {
        e.error = 14, SOCKFS.emit("error", [e.stream.fd, e.error, "ECONNREFUSED: Connection refused"]);
      });
    }, poll(e) {
      if (e.type === 1 && e.server) return e.pending.length ? 65 : 0;
      var t2 = 0, r = e.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(e, e.daddr, e.dport) : null;
      return (e.recv_queue.length || !r || r && r.socket.readyState === r.socket.CLOSING || r && r.socket.readyState === r.socket.CLOSED) && (t2 |= 65), (!r || r && r.socket.readyState === r.socket.OPEN) && (t2 |= 4), (r && r.socket.readyState === r.socket.CLOSING || r && r.socket.readyState === r.socket.CLOSED) && (e.connecting ? t2 |= 4 : t2 |= 16), t2;
    }, ioctl(e, t2, r) {
      switch (t2) {
        case 21531:
          var a2 = 0;
          return e.recv_queue.length && (a2 = e.recv_queue[0].data.length), HEAP32[r >> 2] = a2, 0;
        default:
          return 28;
      }
    }, close(e) {
      if (e.server) {
        try {
          e.server.close();
        } catch {
        }
        e.server = null;
      }
      for (var t2 = Object.keys(e.peers), r = 0; r < t2.length; r++) {
        var a2 = e.peers[t2[r]];
        try {
          a2.socket.close();
        } catch {
        }
        SOCKFS.websocket_sock_ops.removePeer(e, a2);
      }
      return 0;
    }, bind(e, t2, r) {
      if (typeof e.saddr < "u" || typeof e.sport < "u") throw new FS.ErrnoError(28);
      if (e.saddr = t2, e.sport = r, e.type === 2) {
        e.server && (e.server.close(), e.server = null);
        try {
          e.sock_ops.listen(e, 0);
        } catch (a2) {
          if (a2.name !== "ErrnoError" || a2.errno !== 138) throw a2;
        }
      }
    }, connect(e, t2, r) {
      if (e.server) throw new FS.ErrnoError(138);
      if (typeof e.daddr < "u" && typeof e.dport < "u") {
        var a2 = SOCKFS.websocket_sock_ops.getPeer(e, e.daddr, e.dport);
        if (a2) throw a2.socket.readyState === a2.socket.CONNECTING ? new FS.ErrnoError(7) : new FS.ErrnoError(30);
      }
      var s4 = SOCKFS.websocket_sock_ops.createPeer(e, t2, r);
      e.daddr = s4.addr, e.dport = s4.port, e.connecting = true;
    }, listen(e, t2) {
      if (!ENVIRONMENT_IS_NODE) throw new FS.ErrnoError(138);
      if (e.server) throw new FS.ErrnoError(28);
      var r = require("ws").Server, a2 = e.saddr;
      e.server = new r({ host: a2, port: e.sport }), SOCKFS.emit("listen", e.stream.fd), e.server.on("connection", function(s4) {
        if (e.type === 1) {
          var o4 = SOCKFS.createSocket(e.family, e.type, e.protocol), n3 = SOCKFS.websocket_sock_ops.createPeer(o4, s4);
          o4.daddr = n3.addr, o4.dport = n3.port, e.pending.push(o4), SOCKFS.emit("connection", o4.stream.fd);
        } else SOCKFS.websocket_sock_ops.createPeer(e, s4), SOCKFS.emit("connection", e.stream.fd);
      }), e.server.on("close", function() {
        SOCKFS.emit("close", e.stream.fd), e.server = null;
      }), e.server.on("error", function(s4) {
        e.error = 23, SOCKFS.emit("error", [e.stream.fd, e.error, "EHOSTUNREACH: Host is unreachable"]);
      });
    }, accept(e) {
      if (!e.server || !e.pending.length) throw new FS.ErrnoError(28);
      var t2 = e.pending.shift();
      return t2.stream.flags = e.stream.flags, t2;
    }, getname(e, t2) {
      var r, a2;
      if (t2) {
        if (e.daddr === void 0 || e.dport === void 0) throw new FS.ErrnoError(53);
        r = e.daddr, a2 = e.dport;
      } else r = e.saddr || 0, a2 = e.sport || 0;
      return { addr: r, port: a2 };
    }, sendmsg(e, t2, r, a2, s4, o4) {
      if (e.type === 2) {
        if ((s4 === void 0 || o4 === void 0) && (s4 = e.daddr, o4 = e.dport), s4 === void 0 || o4 === void 0) throw new FS.ErrnoError(17);
      } else s4 = e.daddr, o4 = e.dport;
      var n3 = SOCKFS.websocket_sock_ops.getPeer(e, s4, o4);
      if (e.type === 1 && (!n3 || n3.socket.readyState === n3.socket.CLOSING || n3.socket.readyState === n3.socket.CLOSED)) throw new FS.ErrnoError(53);
      ArrayBuffer.isView(t2) && (r += t2.byteOffset, t2 = t2.buffer);
      var _3 = t2.slice(r, r + a2);
      if (!n3 || n3.socket.readyState !== n3.socket.OPEN) return e.type === 2 && (!n3 || n3.socket.readyState === n3.socket.CLOSING || n3.socket.readyState === n3.socket.CLOSED) && (n3 = SOCKFS.websocket_sock_ops.createPeer(e, s4, o4)), n3.msg_send_queue.push(_3), a2;
      try {
        return n3.socket.send(_3), a2;
      } catch {
        throw new FS.ErrnoError(28);
      }
    }, recvmsg(e, t2) {
      if (e.type === 1 && e.server) throw new FS.ErrnoError(53);
      var r = e.recv_queue.shift();
      if (!r) {
        if (e.type === 1) {
          var a2 = SOCKFS.websocket_sock_ops.getPeer(e, e.daddr, e.dport);
          if (!a2) throw new FS.ErrnoError(53);
          if (a2.socket.readyState === a2.socket.CLOSING || a2.socket.readyState === a2.socket.CLOSED) return null;
          throw new FS.ErrnoError(6);
        }
        throw new FS.ErrnoError(6);
      }
      var s4 = r.data.byteLength || r.data.length, o4 = r.data.byteOffset || 0, n3 = r.data.buffer || r.data, _3 = Math.min(t2, s4), l3 = { buffer: new Uint8Array(n3, o4, _3), addr: r.addr, port: r.port };
      if (e.type === 1 && _3 < s4) {
        var p4 = s4 - _3;
        r.data = new Uint8Array(n3, o4 + _3, p4), e.recv_queue.unshift(r);
      }
      return l3;
    } } }, getSocketFromFD = (e) => {
      var t2 = SOCKFS.getSocket(e);
      if (!t2) throw new FS.ErrnoError(8);
      return t2;
    }, inetNtop4 = (e) => (e & 255) + "." + (e >> 8 & 255) + "." + (e >> 16 & 255) + "." + (e >> 24 & 255), inetNtop6 = (e) => {
      var t2 = "", r = 0, a2 = 0, s4 = 0, o4 = 0, n3 = 0, _3 = 0, l3 = [e[0] & 65535, e[0] >> 16, e[1] & 65535, e[1] >> 16, e[2] & 65535, e[2] >> 16, e[3] & 65535, e[3] >> 16], p4 = true, m4 = "";
      for (_3 = 0; _3 < 5; _3++) if (l3[_3] !== 0) {
        p4 = false;
        break;
      }
      if (p4) {
        if (m4 = inetNtop4(l3[6] | l3[7] << 16), l3[5] === -1) return t2 = "::ffff:", t2 += m4, t2;
        if (l3[5] === 0) return t2 = "::", m4 === "0.0.0.0" && (m4 = ""), m4 === "0.0.0.1" && (m4 = "1"), t2 += m4, t2;
      }
      for (r = 0; r < 8; r++) l3[r] === 0 && (r - s4 > 1 && (n3 = 0), s4 = r, n3++), n3 > a2 && (a2 = n3, o4 = r - a2 + 1);
      for (r = 0; r < 8; r++) {
        if (a2 > 1 && l3[r] === 0 && r >= o4 && r < o4 + a2) {
          r === o4 && (t2 += ":", o4 === 0 && (t2 += ":"));
          continue;
        }
        t2 += Number(_ntohs(l3[r] & 65535)).toString(16), t2 += r < 7 ? ":" : "";
      }
      return t2;
    }, readSockaddr = (e, t2) => {
      var r = HEAP16[e >> 1], a2 = _ntohs(HEAPU16[e + 2 >> 1]), s4;
      switch (r) {
        case 2:
          if (t2 !== 16) return { errno: 28 };
          s4 = HEAP32[e + 4 >> 2], s4 = inetNtop4(s4);
          break;
        case 10:
          if (t2 !== 28) return { errno: 28 };
          s4 = [HEAP32[e + 8 >> 2], HEAP32[e + 12 >> 2], HEAP32[e + 16 >> 2], HEAP32[e + 20 >> 2]], s4 = inetNtop6(s4);
          break;
        default:
          return { errno: 5 };
      }
      return { family: r, addr: s4, port: a2 };
    }, inetPton4 = (e) => {
      for (var t2 = e.split("."), r = 0; r < 4; r++) {
        var a2 = Number(t2[r]);
        if (isNaN(a2)) return null;
        t2[r] = a2;
      }
      return (t2[0] | t2[1] << 8 | t2[2] << 16 | t2[3] << 24) >>> 0;
    }, jstoi_q = (e) => parseInt(e), inetPton6 = (e) => {
      var t2, r, a2, s4, o4 = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i, n3 = [];
      if (!o4.test(e)) return null;
      if (e === "::") return [0, 0, 0, 0, 0, 0, 0, 0];
      for (e.startsWith("::") ? e = e.replace("::", "Z:") : e = e.replace("::", ":Z:"), e.indexOf(".") > 0 ? (e = e.replace(new RegExp("[.]", "g"), ":"), t2 = e.split(":"), t2[t2.length - 4] = jstoi_q(t2[t2.length - 4]) + jstoi_q(t2[t2.length - 3]) * 256, t2[t2.length - 3] = jstoi_q(t2[t2.length - 2]) + jstoi_q(t2[t2.length - 1]) * 256, t2 = t2.slice(0, t2.length - 2)) : t2 = e.split(":"), a2 = 0, s4 = 0, r = 0; r < t2.length; r++) if (typeof t2[r] == "string") if (t2[r] === "Z") {
        for (s4 = 0; s4 < 8 - t2.length + 1; s4++) n3[r + s4] = 0;
        a2 = s4 - 1;
      } else n3[r + a2] = _htons(parseInt(t2[r], 16));
      else n3[r + a2] = t2[r];
      return [n3[1] << 16 | n3[0], n3[3] << 16 | n3[2], n3[5] << 16 | n3[4], n3[7] << 16 | n3[6]];
    }, DNS = { address_map: { id: 1, addrs: {}, names: {} }, lookup_name(e) {
      var t2 = inetPton4(e);
      if (t2 !== null || (t2 = inetPton6(e), t2 !== null)) return e;
      var r;
      if (DNS.address_map.addrs[e]) r = DNS.address_map.addrs[e];
      else {
        var a2 = DNS.address_map.id++;
        assert(a2 < 65535, "exceeded max address mappings of 65535"), r = "172.29." + (a2 & 255) + "." + (a2 & 65280), DNS.address_map.names[r] = e, DNS.address_map.addrs[e] = r;
      }
      return r;
    }, lookup_addr(e) {
      return DNS.address_map.names[e] ? DNS.address_map.names[e] : null;
    } }, getSocketAddress = (e, t2) => {
      var r = readSockaddr(e, t2);
      if (r.errno) throw new FS.ErrnoError(r.errno);
      return r.addr = DNS.lookup_addr(r.addr) || r.addr, r;
    };
    function ___syscall_bind(e, t2, r, a2, s4, o4) {
      try {
        var n3 = getSocketFromFD(e), _3 = getSocketAddress(t2, r);
        return n3.sock_ops.bind(n3, _3.addr, _3.port), 0;
      } catch (l3) {
        if (typeof FS > "u" || l3.name !== "ErrnoError") throw l3;
        return -l3.errno;
      }
    }
    ___syscall_bind.sig = "iippiii";
    function ___syscall_chdir(e) {
      try {
        return e = SYSCALLS.getStr(e), FS.chdir(e), 0;
      } catch (t2) {
        if (typeof FS > "u" || t2.name !== "ErrnoError") throw t2;
        return -t2.errno;
      }
    }
    ___syscall_chdir.sig = "ip";
    function ___syscall_chmod(e, t2) {
      try {
        return e = SYSCALLS.getStr(e), FS.chmod(e, t2), 0;
      } catch (r) {
        if (typeof FS > "u" || r.name !== "ErrnoError") throw r;
        return -r.errno;
      }
    }
    ___syscall_chmod.sig = "ipi";
    function ___syscall_dup(e) {
      try {
        var t2 = SYSCALLS.getStreamFromFD(e);
        return FS.dupStream(t2).fd;
      } catch (r) {
        if (typeof FS > "u" || r.name !== "ErrnoError") throw r;
        return -r.errno;
      }
    }
    ___syscall_dup.sig = "ii";
    function ___syscall_dup3(e, t2, r) {
      try {
        var a2 = SYSCALLS.getStreamFromFD(e);
        if (a2.fd === t2) return -28;
        if (t2 < 0 || t2 >= FS.MAX_OPEN_FDS) return -8;
        var s4 = FS.getStream(t2);
        return s4 && FS.close(s4), FS.dupStream(a2, t2).fd;
      } catch (o4) {
        if (typeof FS > "u" || o4.name !== "ErrnoError") throw o4;
        return -o4.errno;
      }
    }
    ___syscall_dup3.sig = "iiii";
    function ___syscall_faccessat(e, t2, r, a2) {
      try {
        if (t2 = SYSCALLS.getStr(t2), t2 = SYSCALLS.calculateAt(e, t2), r & -8) return -28;
        var s4 = FS.lookupPath(t2, { follow: true }), o4 = s4.node;
        if (!o4) return -44;
        var n3 = "";
        return r & 4 && (n3 += "r"), r & 2 && (n3 += "w"), r & 1 && (n3 += "x"), n3 && FS.nodePermissions(o4, n3) ? -2 : 0;
      } catch (_3) {
        if (typeof FS > "u" || _3.name !== "ErrnoError") throw _3;
        return -_3.errno;
      }
    }
    ___syscall_faccessat.sig = "iipii";
    var ___syscall_fadvise64 = (e, t2, r, a2) => 0;
    ___syscall_fadvise64.sig = "iijji";
    var INT53_MAX = 9007199254740992, INT53_MIN = -9007199254740992, bigintToI53Checked = (e) => e < INT53_MIN || e > INT53_MAX ? NaN : Number(e);
    function ___syscall_fallocate(e, t2, r, a2) {
      r = bigintToI53Checked(r), a2 = bigintToI53Checked(a2);
      try {
        if (isNaN(r)) return 61;
        var s4 = SYSCALLS.getStreamFromFD(e);
        return FS.allocate(s4, r, a2), 0;
      } catch (o4) {
        if (typeof FS > "u" || o4.name !== "ErrnoError") throw o4;
        return -o4.errno;
      }
    }
    ___syscall_fallocate.sig = "iiijj";
    var syscallGetVarargI = () => {
      var e = HEAP32[+SYSCALLS.varargs >> 2];
      return SYSCALLS.varargs += 4, e;
    }, syscallGetVarargP = syscallGetVarargI;
    function ___syscall_fcntl64(e, t2, r) {
      SYSCALLS.varargs = r;
      try {
        var a2 = SYSCALLS.getStreamFromFD(e);
        switch (t2) {
          case 0: {
            var s4 = syscallGetVarargI();
            if (s4 < 0) return -28;
            for (; FS.streams[s4]; ) s4++;
            var o4;
            return o4 = FS.dupStream(a2, s4), o4.fd;
          }
          case 1:
          case 2:
            return 0;
          case 3:
            return a2.flags;
          case 4: {
            var s4 = syscallGetVarargI();
            return a2.flags |= s4, 0;
          }
          case 12: {
            var s4 = syscallGetVarargP(), n3 = 0;
            return HEAP16[s4 + n3 >> 1] = 2, 0;
          }
          case 13:
          case 14:
            return 0;
        }
        return -28;
      } catch (_3) {
        if (typeof FS > "u" || _3.name !== "ErrnoError") throw _3;
        return -_3.errno;
      }
    }
    ___syscall_fcntl64.sig = "iiip";
    function ___syscall_fdatasync(e) {
      try {
        var t2 = SYSCALLS.getStreamFromFD(e);
        return 0;
      } catch (r) {
        if (typeof FS > "u" || r.name !== "ErrnoError") throw r;
        return -r.errno;
      }
    }
    ___syscall_fdatasync.sig = "ii";
    function ___syscall_fstat64(e, t2) {
      try {
        var r = SYSCALLS.getStreamFromFD(e);
        return SYSCALLS.doStat(FS.stat, r.path, t2);
      } catch (a2) {
        if (typeof FS > "u" || a2.name !== "ErrnoError") throw a2;
        return -a2.errno;
      }
    }
    ___syscall_fstat64.sig = "iip";
    function ___syscall_ftruncate64(e, t2) {
      t2 = bigintToI53Checked(t2);
      try {
        return isNaN(t2) ? 61 : (FS.ftruncate(e, t2), 0);
      } catch (r) {
        if (typeof FS > "u" || r.name !== "ErrnoError") throw r;
        return -r.errno;
      }
    }
    ___syscall_ftruncate64.sig = "iij";
    var stringToUTF8 = (e, t2, r) => stringToUTF8Array(e, HEAPU8, t2, r);
    function ___syscall_getcwd(e, t2) {
      try {
        if (t2 === 0) return -28;
        var r = FS.cwd(), a2 = lengthBytesUTF8(r) + 1;
        return t2 < a2 ? -68 : (stringToUTF8(r, e, t2), a2);
      } catch (s4) {
        if (typeof FS > "u" || s4.name !== "ErrnoError") throw s4;
        return -s4.errno;
      }
    }
    ___syscall_getcwd.sig = "ipp";
    function ___syscall_getdents64(e, t2, r) {
      try {
        var a2 = SYSCALLS.getStreamFromFD(e);
        a2.getdents || (a2.getdents = FS.readdir(a2.path));
        for (var s4 = 280, o4 = 0, n3 = FS.llseek(a2, 0, 1), _3 = Math.floor(n3 / s4), l3 = Math.min(a2.getdents.length, _3 + Math.floor(r / s4)), p4 = _3; p4 < l3; p4++) {
          var m4, d2, g5 = a2.getdents[p4];
          if (g5 === ".") m4 = a2.node.id, d2 = 4;
          else if (g5 === "..") {
            var u2 = FS.lookupPath(a2.path, { parent: true });
            m4 = u2.node.id, d2 = 4;
          } else {
            var f3;
            try {
              f3 = FS.lookupNode(a2.node, g5);
            } catch (c2) {
              if (c2?.errno === 28) continue;
              throw c2;
            }
            m4 = f3.id, d2 = FS.isChrdev(f3.mode) ? 2 : FS.isDir(f3.mode) ? 4 : FS.isLink(f3.mode) ? 10 : 8;
          }
          HEAP64[t2 + o4 >> 3] = BigInt(m4), HEAP64[t2 + o4 + 8 >> 3] = BigInt((p4 + 1) * s4), HEAP16[t2 + o4 + 16 >> 1] = 280, HEAP8[t2 + o4 + 18] = d2, stringToUTF8(g5, t2 + o4 + 19, 256), o4 += s4;
        }
        return FS.llseek(a2, p4 * s4, 0), o4;
      } catch (c2) {
        if (typeof FS > "u" || c2.name !== "ErrnoError") throw c2;
        return -c2.errno;
      }
    }
    ___syscall_getdents64.sig = "iipp";
    function ___syscall_ioctl(e, t2, r) {
      SYSCALLS.varargs = r;
      try {
        var a2 = SYSCALLS.getStreamFromFD(e);
        switch (t2) {
          case 21509:
            return a2.tty ? 0 : -59;
          case 21505: {
            if (!a2.tty) return -59;
            if (a2.tty.ops.ioctl_tcgets) {
              var s4 = a2.tty.ops.ioctl_tcgets(a2), o4 = syscallGetVarargP();
              HEAP32[o4 >> 2] = s4.c_iflag || 0, HEAP32[o4 + 4 >> 2] = s4.c_oflag || 0, HEAP32[o4 + 8 >> 2] = s4.c_cflag || 0, HEAP32[o4 + 12 >> 2] = s4.c_lflag || 0;
              for (var n3 = 0; n3 < 32; n3++) HEAP8[o4 + n3 + 17] = s4.c_cc[n3] || 0;
              return 0;
            }
            return 0;
          }
          case 21510:
          case 21511:
          case 21512:
            return a2.tty ? 0 : -59;
          case 21506:
          case 21507:
          case 21508: {
            if (!a2.tty) return -59;
            if (a2.tty.ops.ioctl_tcsets) {
              for (var o4 = syscallGetVarargP(), _3 = HEAP32[o4 >> 2], l3 = HEAP32[o4 + 4 >> 2], p4 = HEAP32[o4 + 8 >> 2], m4 = HEAP32[o4 + 12 >> 2], d2 = [], n3 = 0; n3 < 32; n3++) d2.push(HEAP8[o4 + n3 + 17]);
              return a2.tty.ops.ioctl_tcsets(a2.tty, t2, { c_iflag: _3, c_oflag: l3, c_cflag: p4, c_lflag: m4, c_cc: d2 });
            }
            return 0;
          }
          case 21519: {
            if (!a2.tty) return -59;
            var o4 = syscallGetVarargP();
            return HEAP32[o4 >> 2] = 0, 0;
          }
          case 21520:
            return a2.tty ? -28 : -59;
          case 21531: {
            var o4 = syscallGetVarargP();
            return FS.ioctl(a2, t2, o4);
          }
          case 21523: {
            if (!a2.tty) return -59;
            if (a2.tty.ops.ioctl_tiocgwinsz) {
              var g5 = a2.tty.ops.ioctl_tiocgwinsz(a2.tty), o4 = syscallGetVarargP();
              HEAP16[o4 >> 1] = g5[0], HEAP16[o4 + 2 >> 1] = g5[1];
            }
            return 0;
          }
          case 21524:
            return a2.tty ? 0 : -59;
          case 21515:
            return a2.tty ? 0 : -59;
          default:
            return -28;
        }
      } catch (u2) {
        if (typeof FS > "u" || u2.name !== "ErrnoError") throw u2;
        return -u2.errno;
      }
    }
    ___syscall_ioctl.sig = "iiip";
    function ___syscall_lstat64(e, t2) {
      try {
        return e = SYSCALLS.getStr(e), SYSCALLS.doStat(FS.lstat, e, t2);
      } catch (r) {
        if (typeof FS > "u" || r.name !== "ErrnoError") throw r;
        return -r.errno;
      }
    }
    ___syscall_lstat64.sig = "ipp";
    function ___syscall_mkdirat(e, t2, r) {
      try {
        return t2 = SYSCALLS.getStr(t2), t2 = SYSCALLS.calculateAt(e, t2), FS.mkdir(t2, r, 0), 0;
      } catch (a2) {
        if (typeof FS > "u" || a2.name !== "ErrnoError") throw a2;
        return -a2.errno;
      }
    }
    ___syscall_mkdirat.sig = "iipi";
    function ___syscall_newfstatat(e, t2, r, a2) {
      try {
        t2 = SYSCALLS.getStr(t2);
        var s4 = a2 & 256, o4 = a2 & 4096;
        return a2 = a2 & -6401, t2 = SYSCALLS.calculateAt(e, t2, o4), SYSCALLS.doStat(s4 ? FS.lstat : FS.stat, t2, r);
      } catch (n3) {
        if (typeof FS > "u" || n3.name !== "ErrnoError") throw n3;
        return -n3.errno;
      }
    }
    ___syscall_newfstatat.sig = "iippi";
    function ___syscall_openat(e, t2, r, a2) {
      SYSCALLS.varargs = a2;
      try {
        t2 = SYSCALLS.getStr(t2), t2 = SYSCALLS.calculateAt(e, t2);
        var s4 = a2 ? syscallGetVarargI() : 0;
        return FS.open(t2, r, s4).fd;
      } catch (o4) {
        if (typeof FS > "u" || o4.name !== "ErrnoError") throw o4;
        return -o4.errno;
      }
    }
    ___syscall_openat.sig = "iipip";
    var PIPEFS = { BUCKET_BUFFER_SIZE: 8192, mount(e) {
      return FS.createNode(null, "/", 16895, 0);
    }, createPipe() {
      var e = { buckets: [], refcnt: 2 };
      e.buckets.push({ buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE), offset: 0, roffset: 0 });
      var t2 = PIPEFS.nextname(), r = PIPEFS.nextname(), a2 = FS.createNode(PIPEFS.root, t2, 4096, 0), s4 = FS.createNode(PIPEFS.root, r, 4096, 0);
      a2.pipe = e, s4.pipe = e;
      var o4 = FS.createStream({ path: t2, node: a2, flags: 0, seekable: false, stream_ops: PIPEFS.stream_ops });
      a2.stream = o4;
      var n3 = FS.createStream({ path: r, node: s4, flags: 1, seekable: false, stream_ops: PIPEFS.stream_ops });
      return s4.stream = n3, { readable_fd: o4.fd, writable_fd: n3.fd };
    }, stream_ops: { poll(e) {
      var t2 = e.node.pipe;
      if ((e.flags & 2097155) === 1) return 260;
      if (t2.buckets.length > 0) for (var r = 0; r < t2.buckets.length; r++) {
        var a2 = t2.buckets[r];
        if (a2.offset - a2.roffset > 0) return 65;
      }
      return 0;
    }, ioctl(e, t2, r) {
      return 28;
    }, fsync(e) {
      return 28;
    }, read(e, t2, r, a2, s4) {
      for (var o4 = e.node.pipe, n3 = 0, _3 = 0; _3 < o4.buckets.length; _3++) {
        var l3 = o4.buckets[_3];
        n3 += l3.offset - l3.roffset;
      }
      var p4 = t2.subarray(r, r + a2);
      if (a2 <= 0) return 0;
      if (n3 == 0) throw new FS.ErrnoError(6);
      for (var m4 = Math.min(n3, a2), d2 = m4, g5 = 0, _3 = 0; _3 < o4.buckets.length; _3++) {
        var u2 = o4.buckets[_3], f3 = u2.offset - u2.roffset;
        if (m4 <= f3) {
          var c2 = u2.buffer.subarray(u2.roffset, u2.offset);
          m4 < f3 ? (c2 = c2.subarray(0, m4), u2.roffset += m4) : g5++, p4.set(c2);
          break;
        } else {
          var c2 = u2.buffer.subarray(u2.roffset, u2.offset);
          p4.set(c2), p4 = p4.subarray(c2.byteLength), m4 -= c2.byteLength, g5++;
        }
      }
      return g5 && g5 == o4.buckets.length && (g5--, o4.buckets[g5].offset = 0, o4.buckets[g5].roffset = 0), o4.buckets.splice(0, g5), d2;
    }, write(e, t2, r, a2, s4) {
      var o4 = e.node.pipe, n3 = t2.subarray(r, r + a2), _3 = n3.byteLength;
      if (_3 <= 0) return 0;
      var l3 = null;
      o4.buckets.length == 0 ? (l3 = { buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE), offset: 0, roffset: 0 }, o4.buckets.push(l3)) : l3 = o4.buckets[o4.buckets.length - 1], assert(l3.offset <= PIPEFS.BUCKET_BUFFER_SIZE);
      var p4 = PIPEFS.BUCKET_BUFFER_SIZE - l3.offset;
      if (p4 >= _3) return l3.buffer.set(n3, l3.offset), l3.offset += _3, _3;
      p4 > 0 && (l3.buffer.set(n3.subarray(0, p4), l3.offset), l3.offset += p4, n3 = n3.subarray(p4, n3.byteLength));
      for (var m4 = n3.byteLength / PIPEFS.BUCKET_BUFFER_SIZE | 0, d2 = n3.byteLength % PIPEFS.BUCKET_BUFFER_SIZE, g5 = 0; g5 < m4; g5++) {
        var u2 = { buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE), offset: PIPEFS.BUCKET_BUFFER_SIZE, roffset: 0 };
        o4.buckets.push(u2), u2.buffer.set(n3.subarray(0, PIPEFS.BUCKET_BUFFER_SIZE)), n3 = n3.subarray(PIPEFS.BUCKET_BUFFER_SIZE, n3.byteLength);
      }
      if (d2 > 0) {
        var u2 = { buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE), offset: n3.byteLength, roffset: 0 };
        o4.buckets.push(u2), u2.buffer.set(n3);
      }
      return _3;
    }, close(e) {
      var t2 = e.node.pipe;
      t2.refcnt--, t2.refcnt === 0 && (t2.buckets = null);
    } }, nextname() {
      return PIPEFS.nextname.current || (PIPEFS.nextname.current = 0), "pipe[" + PIPEFS.nextname.current++ + "]";
    } };
    function ___syscall_pipe(e) {
      try {
        if (e == 0) throw new FS.ErrnoError(21);
        var t2 = PIPEFS.createPipe();
        return HEAP32[e >> 2] = t2.readable_fd, HEAP32[e + 4 >> 2] = t2.writable_fd, 0;
      } catch (r) {
        if (typeof FS > "u" || r.name !== "ErrnoError") throw r;
        return -r.errno;
      }
    }
    ___syscall_pipe.sig = "ip";
    function ___syscall_readlinkat(e, t2, r, a2) {
      try {
        if (t2 = SYSCALLS.getStr(t2), t2 = SYSCALLS.calculateAt(e, t2), a2 <= 0) return -28;
        var s4 = FS.readlink(t2), o4 = Math.min(a2, lengthBytesUTF8(s4)), n3 = HEAP8[r + o4];
        return stringToUTF8(s4, r, a2 + 1), HEAP8[r + o4] = n3, o4;
      } catch (_3) {
        if (typeof FS > "u" || _3.name !== "ErrnoError") throw _3;
        return -_3.errno;
      }
    }
    ___syscall_readlinkat.sig = "iippp";
    var writeSockaddr = (e, t2, r, a2, s4) => {
      switch (t2) {
        case 2:
          r = inetPton4(r), zeroMemory(e, 16), s4 && (HEAP32[s4 >> 2] = 16), HEAP16[e >> 1] = t2, HEAP32[e + 4 >> 2] = r, HEAP16[e + 2 >> 1] = _htons(a2);
          break;
        case 10:
          r = inetPton6(r), zeroMemory(e, 28), s4 && (HEAP32[s4 >> 2] = 28), HEAP32[e >> 2] = t2, HEAP32[e + 8 >> 2] = r[0], HEAP32[e + 12 >> 2] = r[1], HEAP32[e + 16 >> 2] = r[2], HEAP32[e + 20 >> 2] = r[3], HEAP16[e + 2 >> 1] = _htons(a2);
          break;
        default:
          return 5;
      }
      return 0;
    };
    function ___syscall_recvfrom(e, t2, r, a2, s4, o4) {
      try {
        var n3 = getSocketFromFD(e), _3 = n3.sock_ops.recvmsg(n3, r);
        if (!_3) return 0;
        if (s4) var l3 = writeSockaddr(s4, n3.family, DNS.lookup_name(_3.addr), _3.port, o4);
        return HEAPU8.set(_3.buffer, t2), _3.buffer.byteLength;
      } catch (p4) {
        if (typeof FS > "u" || p4.name !== "ErrnoError") throw p4;
        return -p4.errno;
      }
    }
    ___syscall_recvfrom.sig = "iippipp";
    function ___syscall_renameat(e, t2, r, a2) {
      try {
        return t2 = SYSCALLS.getStr(t2), a2 = SYSCALLS.getStr(a2), t2 = SYSCALLS.calculateAt(e, t2), a2 = SYSCALLS.calculateAt(r, a2), FS.rename(t2, a2), 0;
      } catch (s4) {
        if (typeof FS > "u" || s4.name !== "ErrnoError") throw s4;
        return -s4.errno;
      }
    }
    ___syscall_renameat.sig = "iipip";
    function ___syscall_rmdir(e) {
      try {
        return e = SYSCALLS.getStr(e), FS.rmdir(e), 0;
      } catch (t2) {
        if (typeof FS > "u" || t2.name !== "ErrnoError") throw t2;
        return -t2.errno;
      }
    }
    ___syscall_rmdir.sig = "ip";
    function ___syscall_sendto(e, t2, r, a2, s4, o4) {
      try {
        var n3 = getSocketFromFD(e);
        if (!s4) return FS.write(n3.stream, HEAP8, t2, r);
        var _3 = getSocketAddress(s4, o4);
        return n3.sock_ops.sendmsg(n3, HEAP8, t2, r, _3.addr, _3.port);
      } catch (l3) {
        if (typeof FS > "u" || l3.name !== "ErrnoError") throw l3;
        return -l3.errno;
      }
    }
    ___syscall_sendto.sig = "iippipp";
    function ___syscall_socket(e, t2, r) {
      try {
        var a2 = SOCKFS.createSocket(e, t2, r);
        return a2.stream.fd;
      } catch (s4) {
        if (typeof FS > "u" || s4.name !== "ErrnoError") throw s4;
        return -s4.errno;
      }
    }
    ___syscall_socket.sig = "iiiiiii";
    function ___syscall_stat64(e, t2) {
      try {
        return e = SYSCALLS.getStr(e), SYSCALLS.doStat(FS.stat, e, t2);
      } catch (r) {
        if (typeof FS > "u" || r.name !== "ErrnoError") throw r;
        return -r.errno;
      }
    }
    ___syscall_stat64.sig = "ipp";
    function ___syscall_symlinkat(e, t2, r) {
      try {
        return e = SYSCALLS.getStr(e), r = SYSCALLS.getStr(r), r = SYSCALLS.calculateAt(t2, r), FS.symlink(e, r), 0;
      } catch (a2) {
        if (typeof FS > "u" || a2.name !== "ErrnoError") throw a2;
        return -a2.errno;
      }
    }
    ___syscall_symlinkat.sig = "ipip";
    function ___syscall_truncate64(e, t2) {
      t2 = bigintToI53Checked(t2);
      try {
        return isNaN(t2) ? 61 : (e = SYSCALLS.getStr(e), FS.truncate(e, t2), 0);
      } catch (r) {
        if (typeof FS > "u" || r.name !== "ErrnoError") throw r;
        return -r.errno;
      }
    }
    ___syscall_truncate64.sig = "ipj";
    function ___syscall_unlinkat(e, t2, r) {
      try {
        return t2 = SYSCALLS.getStr(t2), t2 = SYSCALLS.calculateAt(e, t2), r === 0 ? FS.unlink(t2) : r === 512 ? FS.rmdir(t2) : abort("Invalid flags passed to unlinkat"), 0;
      } catch (a2) {
        if (typeof FS > "u" || a2.name !== "ErrnoError") throw a2;
        return -a2.errno;
      }
    }
    ___syscall_unlinkat.sig = "iipi";
    var ___table_base = new WebAssembly.Global({ value: "i32", mutable: false }, 1);
    Module.___table_base = ___table_base;
    var __abort_js = () => abort("");
    __abort_js.sig = "v";
    var ENV = {}, stackAlloc = (e) => __emscripten_stack_alloc(e), stringToUTF8OnStack = (e) => {
      var t2 = lengthBytesUTF8(e) + 1, r = stackAlloc(t2);
      return stringToUTF8(e, r, t2), r;
    }, dlSetError = (e) => {
      var t2 = stackSave(), r = stringToUTF8OnStack(e);
      ___dl_seterr(r, 0), stackRestore(t2);
    }, dlopenInternal = (e, t2) => {
      var r = UTF8ToString(e + 36), a2 = HEAP32[e + 4 >> 2];
      r = PATH.normalize(r);
      var s4 = !!(a2 & 256), o4 = s4 ? null : {}, n3 = { global: s4, nodelete: !!(a2 & 4096), loadAsync: t2.loadAsync };
      if (t2.loadAsync) return loadDynamicLibrary(r, n3, o4, e);
      try {
        return loadDynamicLibrary(r, n3, o4, e);
      } catch (_3) {
        return dlSetError(`Could not load dynamic lib: ${r}
${_3}`), 0;
      }
    }, __dlopen_js = (e) => dlopenInternal(e, { loadAsync: false });
    __dlopen_js.sig = "pp";
    var __dlsym_js = (e, t2, r) => {
      t2 = UTF8ToString(t2);
      var a2, s4, o4 = LDSO.loadedLibsByHandle[e];
      if (!o4.exports.hasOwnProperty(t2) || o4.exports[t2].stub) return dlSetError(`Tried to lookup unknown symbol "${t2}" in dynamic lib: ${o4.name}`), 0;
      if (s4 = Object.keys(o4.exports).indexOf(t2), a2 = o4.exports[t2], typeof a2 == "function") {
        var n3 = getFunctionAddress(a2);
        n3 ? a2 = n3 : (a2 = addFunction(a2, a2.sig), HEAPU32[r >> 2] = s4);
      }
      return a2;
    };
    __dlsym_js.sig = "pppp";
    var __emscripten_memcpy_js = (e, t2, r) => HEAPU8.copyWithin(e, t2, t2 + r);
    __emscripten_memcpy_js.sig = "vppp";
    var runtimeKeepaliveCounter = 0, __emscripten_runtime_keepalive_clear = () => {
      noExitRuntime = false, runtimeKeepaliveCounter = 0;
    };
    __emscripten_runtime_keepalive_clear.sig = "v";
    var __emscripten_system = (e) => {
      if (ENVIRONMENT_IS_NODE) {
        if (!e) return 1;
        var t2 = UTF8ToString(e);
        if (!t2.length) return 0;
        var r = require("child_process"), a2 = r.spawnSync(t2, [], { shell: true, stdio: "inherit" }), s4 = (n3, _3) => n3 << 8 | _3;
        if (a2.status === null) {
          var o4 = (n3) => {
            switch (n3) {
              case "SIGHUP":
                return 1;
              case "SIGQUIT":
                return 3;
              case "SIGFPE":
                return 8;
              case "SIGKILL":
                return 9;
              case "SIGALRM":
                return 14;
              case "SIGTERM":
                return 15;
              default:
                return 2;
            }
          };
          return s4(0, o4(a2.signal));
        }
        return s4(a2.status, 0);
      }
      return e ? -52 : 0;
    };
    __emscripten_system.sig = "ip";
    var __emscripten_throw_longjmp = () => {
      throw 1 / 0;
    };
    __emscripten_throw_longjmp.sig = "v";
    function __gmtime_js(e, t2) {
      e = bigintToI53Checked(e);
      var r = new Date(e * 1e3);
      HEAP32[t2 >> 2] = r.getUTCSeconds(), HEAP32[t2 + 4 >> 2] = r.getUTCMinutes(), HEAP32[t2 + 8 >> 2] = r.getUTCHours(), HEAP32[t2 + 12 >> 2] = r.getUTCDate(), HEAP32[t2 + 16 >> 2] = r.getUTCMonth(), HEAP32[t2 + 20 >> 2] = r.getUTCFullYear() - 1900, HEAP32[t2 + 24 >> 2] = r.getUTCDay();
      var a2 = Date.UTC(r.getUTCFullYear(), 0, 1, 0, 0, 0, 0), s4 = (r.getTime() - a2) / (1e3 * 60 * 60 * 24) | 0;
      HEAP32[t2 + 28 >> 2] = s4;
    }
    __gmtime_js.sig = "vjp";
    var isLeapYear = (e) => e % 4 === 0 && (e % 100 !== 0 || e % 400 === 0), MONTH_DAYS_LEAP_CUMULATIVE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], MONTH_DAYS_REGULAR_CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], ydayFromDate = (e) => {
      var t2 = isLeapYear(e.getFullYear()), r = t2 ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE, a2 = r[e.getMonth()] + e.getDate() - 1;
      return a2;
    };
    function __localtime_js(e, t2) {
      e = bigintToI53Checked(e);
      var r = new Date(e * 1e3);
      HEAP32[t2 >> 2] = r.getSeconds(), HEAP32[t2 + 4 >> 2] = r.getMinutes(), HEAP32[t2 + 8 >> 2] = r.getHours(), HEAP32[t2 + 12 >> 2] = r.getDate(), HEAP32[t2 + 16 >> 2] = r.getMonth(), HEAP32[t2 + 20 >> 2] = r.getFullYear() - 1900, HEAP32[t2 + 24 >> 2] = r.getDay();
      var a2 = ydayFromDate(r) | 0;
      HEAP32[t2 + 28 >> 2] = a2, HEAP32[t2 + 36 >> 2] = -(r.getTimezoneOffset() * 60);
      var s4 = new Date(r.getFullYear(), 0, 1), o4 = new Date(r.getFullYear(), 6, 1).getTimezoneOffset(), n3 = s4.getTimezoneOffset(), _3 = (o4 != n3 && r.getTimezoneOffset() == Math.min(n3, o4)) | 0;
      HEAP32[t2 + 32 >> 2] = _3;
    }
    __localtime_js.sig = "vjp";
    function __mmap_js(e, t2, r, a2, s4, o4, n3) {
      s4 = bigintToI53Checked(s4);
      try {
        if (isNaN(s4)) return 61;
        var _3 = SYSCALLS.getStreamFromFD(a2), l3 = FS.mmap(_3, e, s4, t2, r), p4 = l3.ptr;
        return HEAP32[o4 >> 2] = l3.allocated, HEAPU32[n3 >> 2] = p4, 0;
      } catch (m4) {
        if (typeof FS > "u" || m4.name !== "ErrnoError") throw m4;
        return -m4.errno;
      }
    }
    __mmap_js.sig = "ipiiijpp";
    function __munmap_js(e, t2, r, a2, s4, o4) {
      o4 = bigintToI53Checked(o4);
      try {
        var n3 = SYSCALLS.getStreamFromFD(s4);
        r & 2 && SYSCALLS.doMsync(e, n3, t2, a2, o4);
      } catch (_3) {
        if (typeof FS > "u" || _3.name !== "ErrnoError") throw _3;
        return -_3.errno;
      }
    }
    __munmap_js.sig = "ippiiij";
    var timers = {}, handleException = (e) => {
      if (e instanceof ExitStatus || e == "unwind") return EXITSTATUS;
      quit_(1, e);
    }, keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0, _proc_exit = (e) => {
      EXITSTATUS = e, keepRuntimeAlive() || (Module.onExit?.(e), ABORT = true), quit_(e, new ExitStatus(e));
    };
    _proc_exit.sig = "vi";
    var exitJS = (e, t2) => {
      EXITSTATUS = e, _proc_exit(e);
    }, _exit = exitJS;
    _exit.sig = "vi";
    var maybeExit = () => {
      if (!keepRuntimeAlive()) try {
        _exit(EXITSTATUS);
      } catch (e) {
        handleException(e);
      }
    }, callUserCallback = (e) => {
      if (!ABORT) try {
        e(), maybeExit();
      } catch (t2) {
        handleException(t2);
      }
    }, _emscripten_get_now = () => performance.now();
    _emscripten_get_now.sig = "d";
    var __setitimer_js = (e, t2) => {
      if (timers[e] && (clearTimeout(timers[e].id), delete timers[e]), !t2) return 0;
      var r = setTimeout(() => {
        delete timers[e], callUserCallback(() => __emscripten_timeout(e, _emscripten_get_now()));
      }, t2);
      return timers[e] = { id: r, timeout_ms: t2 }, 0;
    };
    __setitimer_js.sig = "iid";
    var __tzset_js = (e, t2, r, a2) => {
      var s4 = (/* @__PURE__ */ new Date()).getFullYear(), o4 = new Date(s4, 0, 1), n3 = new Date(s4, 6, 1), _3 = o4.getTimezoneOffset(), l3 = n3.getTimezoneOffset(), p4 = Math.max(_3, l3);
      HEAPU32[e >> 2] = p4 * 60, HEAP32[t2 >> 2] = +(_3 != l3);
      var m4 = (u2) => {
        var f3 = u2 >= 0 ? "-" : "+", c2 = Math.abs(u2), w4 = String(Math.floor(c2 / 60)).padStart(2, "0"), x6 = String(c2 % 60).padStart(2, "0");
        return `UTC${f3}${w4}${x6}`;
      }, d2 = m4(_3), g5 = m4(l3);
      l3 < _3 ? (stringToUTF8(d2, r, 17), stringToUTF8(g5, a2, 17)) : (stringToUTF8(d2, a2, 17), stringToUTF8(g5, r, 17));
    };
    __tzset_js.sig = "vpppp";
    var _emscripten_date_now = () => Date.now();
    _emscripten_date_now.sig = "d";
    var nowIsMonotonic = 1, checkWasiClock = (e) => e >= 0 && e <= 3;
    function _clock_time_get(e, t2, r) {
      if (t2 = bigintToI53Checked(t2), !checkWasiClock(e)) return 28;
      var a2;
      if (e === 0) a2 = _emscripten_date_now();
      else if (nowIsMonotonic) a2 = _emscripten_get_now();
      else return 52;
      var s4 = Math.round(a2 * 1e3 * 1e3);
      return HEAP64[r >> 3] = BigInt(s4), 0;
    }
    _clock_time_get.sig = "iijp";
    var readEmAsmArgsArray = [], readEmAsmArgs = (e, t2) => {
      readEmAsmArgsArray.length = 0;
      for (var r; r = HEAPU8[e++]; ) {
        var a2 = r != 105;
        a2 &= r != 112, t2 += a2 && t2 % 8 ? 4 : 0, readEmAsmArgsArray.push(r == 112 ? HEAPU32[t2 >> 2] : r == 106 ? HEAP64[t2 >> 3] : r == 105 ? HEAP32[t2 >> 2] : HEAPF64[t2 >> 3]), t2 += a2 ? 8 : 4;
      }
      return readEmAsmArgsArray;
    }, runEmAsmFunction = (e, t2, r) => {
      var a2 = readEmAsmArgs(t2, r);
      return ASM_CONSTS[e](...a2);
    }, _emscripten_asm_const_int = (e, t2, r) => runEmAsmFunction(e, t2, r);
    _emscripten_asm_const_int.sig = "ippp";
    var _emscripten_force_exit = (e) => {
      __emscripten_runtime_keepalive_clear(), _exit(e);
    };
    _emscripten_force_exit.sig = "vi";
    var getHeapMax = () => 2147483648, growMemory = (e) => {
      var t2 = wasmMemory.buffer, r = (e - t2.byteLength + 65535) / 65536 | 0;
      try {
        return wasmMemory.grow(r), updateMemoryViews(), 1;
      } catch {
      }
    }, _emscripten_resize_heap = (e) => {
      var t2 = HEAPU8.length;
      e >>>= 0;
      var r = getHeapMax();
      if (e > r) return false;
      for (var a2 = 1; a2 <= 4; a2 *= 2) {
        var s4 = t2 * (1 + 0.2 / a2);
        s4 = Math.min(s4, e + 100663296);
        var o4 = Math.min(r, alignMemory(Math.max(e, s4), 65536)), n3 = growMemory(o4);
        if (n3) return true;
      }
      return false;
    };
    _emscripten_resize_heap.sig = "ip";
    var getExecutableName = () => thisProgram || "./this.program", getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        var e = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8", t2 = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: e, _: getExecutableName() };
        for (var r in ENV) ENV[r] === void 0 ? delete t2[r] : t2[r] = ENV[r];
        var a2 = [];
        for (var r in t2) a2.push(`${r}=${t2[r]}`);
        getEnvStrings.strings = a2;
      }
      return getEnvStrings.strings;
    }, stringToAscii = (e, t2) => {
      for (var r = 0; r < e.length; ++r) HEAP8[t2++] = e.charCodeAt(r);
      HEAP8[t2] = 0;
    }, _environ_get = (e, t2) => {
      var r = 0;
      return getEnvStrings().forEach((a2, s4) => {
        var o4 = t2 + r;
        HEAPU32[e + s4 * 4 >> 2] = o4, stringToAscii(a2, o4), r += a2.length + 1;
      }), 0;
    };
    _environ_get.sig = "ipp";
    var _environ_sizes_get = (e, t2) => {
      var r = getEnvStrings();
      HEAPU32[e >> 2] = r.length;
      var a2 = 0;
      return r.forEach((s4) => a2 += s4.length + 1), HEAPU32[t2 >> 2] = a2, 0;
    };
    _environ_sizes_get.sig = "ipp";
    function _fd_close(e) {
      try {
        var t2 = SYSCALLS.getStreamFromFD(e);
        return FS.close(t2), 0;
      } catch (r) {
        if (typeof FS > "u" || r.name !== "ErrnoError") throw r;
        return r.errno;
      }
    }
    _fd_close.sig = "ii";
    function _fd_fdstat_get(e, t2) {
      try {
        var r = 0, a2 = 0, s4 = 0, o4 = SYSCALLS.getStreamFromFD(e), n3 = o4.tty ? 2 : FS.isDir(o4.mode) ? 3 : FS.isLink(o4.mode) ? 7 : 4;
        return HEAP8[t2] = n3, HEAP16[t2 + 2 >> 1] = s4, HEAP64[t2 + 8 >> 3] = BigInt(r), HEAP64[t2 + 16 >> 3] = BigInt(a2), 0;
      } catch (_3) {
        if (typeof FS > "u" || _3.name !== "ErrnoError") throw _3;
        return _3.errno;
      }
    }
    _fd_fdstat_get.sig = "iip";
    var doReadv = (e, t2, r, a2) => {
      for (var s4 = 0, o4 = 0; o4 < r; o4++) {
        var n3 = HEAPU32[t2 >> 2], _3 = HEAPU32[t2 + 4 >> 2];
        t2 += 8;
        var l3 = FS.read(e, HEAP8, n3, _3, a2);
        if (l3 < 0) return -1;
        if (s4 += l3, l3 < _3) break;
        typeof a2 < "u" && (a2 += l3);
      }
      return s4;
    };
    function _fd_pread(e, t2, r, a2, s4) {
      a2 = bigintToI53Checked(a2);
      try {
        if (isNaN(a2)) return 61;
        var o4 = SYSCALLS.getStreamFromFD(e), n3 = doReadv(o4, t2, r, a2);
        return HEAPU32[s4 >> 2] = n3, 0;
      } catch (_3) {
        if (typeof FS > "u" || _3.name !== "ErrnoError") throw _3;
        return _3.errno;
      }
    }
    _fd_pread.sig = "iippjp";
    var doWritev = (e, t2, r, a2) => {
      for (var s4 = 0, o4 = 0; o4 < r; o4++) {
        var n3 = HEAPU32[t2 >> 2], _3 = HEAPU32[t2 + 4 >> 2];
        t2 += 8;
        var l3 = FS.write(e, HEAP8, n3, _3, a2);
        if (l3 < 0) return -1;
        if (s4 += l3, l3 < _3) break;
        typeof a2 < "u" && (a2 += l3);
      }
      return s4;
    };
    function _fd_pwrite(e, t2, r, a2, s4) {
      a2 = bigintToI53Checked(a2);
      try {
        if (isNaN(a2)) return 61;
        var o4 = SYSCALLS.getStreamFromFD(e), n3 = doWritev(o4, t2, r, a2);
        return HEAPU32[s4 >> 2] = n3, 0;
      } catch (_3) {
        if (typeof FS > "u" || _3.name !== "ErrnoError") throw _3;
        return _3.errno;
      }
    }
    _fd_pwrite.sig = "iippjp";
    function _fd_read(e, t2, r, a2) {
      try {
        var s4 = SYSCALLS.getStreamFromFD(e), o4 = doReadv(s4, t2, r);
        return HEAPU32[a2 >> 2] = o4, 0;
      } catch (n3) {
        if (typeof FS > "u" || n3.name !== "ErrnoError") throw n3;
        return n3.errno;
      }
    }
    _fd_read.sig = "iippp";
    function _fd_seek(e, t2, r, a2) {
      t2 = bigintToI53Checked(t2);
      try {
        if (isNaN(t2)) return 61;
        var s4 = SYSCALLS.getStreamFromFD(e);
        return FS.llseek(s4, t2, r), HEAP64[a2 >> 3] = BigInt(s4.position), s4.getdents && t2 === 0 && r === 0 && (s4.getdents = null), 0;
      } catch (o4) {
        if (typeof FS > "u" || o4.name !== "ErrnoError") throw o4;
        return o4.errno;
      }
    }
    _fd_seek.sig = "iijip";
    function _fd_sync(e) {
      try {
        var t2 = SYSCALLS.getStreamFromFD(e);
        return t2.stream_ops?.fsync ? t2.stream_ops.fsync(t2) : 0;
      } catch (r) {
        if (typeof FS > "u" || r.name !== "ErrnoError") throw r;
        return r.errno;
      }
    }
    _fd_sync.sig = "ii";
    function _fd_write(e, t2, r, a2) {
      try {
        var s4 = SYSCALLS.getStreamFromFD(e), o4 = doWritev(s4, t2, r);
        return HEAPU32[a2 >> 2] = o4, 0;
      } catch (n3) {
        if (typeof FS > "u" || n3.name !== "ErrnoError") throw n3;
        return n3.errno;
      }
    }
    _fd_write.sig = "iippp";
    var _getaddrinfo = (e, t2, r, a2) => {
      var s4 = 0, o4 = 0, n3 = 0, _3 = 0, l3 = 0, p4 = 0, m4;
      function d2(g5, u2, f3, c2, w4, x6) {
        var S3, v3, b3, E2;
        return v3 = g5 === 10 ? 28 : 16, w4 = g5 === 10 ? inetNtop6(w4) : inetNtop4(w4), S3 = _malloc(v3), E2 = writeSockaddr(S3, g5, w4, x6), assert(!E2), b3 = _malloc(32), HEAP32[b3 + 4 >> 2] = g5, HEAP32[b3 + 8 >> 2] = u2, HEAP32[b3 + 12 >> 2] = f3, HEAPU32[b3 + 24 >> 2] = c2, HEAPU32[b3 + 20 >> 2] = S3, g5 === 10 ? HEAP32[b3 + 16 >> 2] = 28 : HEAP32[b3 + 16 >> 2] = 16, HEAP32[b3 + 28 >> 2] = 0, b3;
      }
      if (r && (n3 = HEAP32[r >> 2], _3 = HEAP32[r + 4 >> 2], l3 = HEAP32[r + 8 >> 2], p4 = HEAP32[r + 12 >> 2]), l3 && !p4 && (p4 = l3 === 2 ? 17 : 6), !l3 && p4 && (l3 = p4 === 17 ? 2 : 1), p4 === 0 && (p4 = 6), l3 === 0 && (l3 = 1), !e && !t2) return -2;
      if (n3 & -1088 || r !== 0 && HEAP32[r >> 2] & 2 && !e) return -1;
      if (n3 & 32) return -2;
      if (l3 !== 0 && l3 !== 1 && l3 !== 2) return -7;
      if (_3 !== 0 && _3 !== 2 && _3 !== 10) return -6;
      if (t2 && (t2 = UTF8ToString(t2), o4 = parseInt(t2, 10), isNaN(o4))) return n3 & 1024 ? -2 : -8;
      if (!e) return _3 === 0 && (_3 = 2), n3 & 1 || (_3 === 2 ? s4 = _htonl(2130706433) : s4 = [0, 0, 0, _htonl(1)]), m4 = d2(_3, l3, p4, null, s4, o4), HEAPU32[a2 >> 2] = m4, 0;
      if (e = UTF8ToString(e), s4 = inetPton4(e), s4 !== null) if (_3 === 0 || _3 === 2) _3 = 2;
      else if (_3 === 10 && n3 & 8) s4 = [0, 0, _htonl(65535), s4], _3 = 10;
      else return -2;
      else if (s4 = inetPton6(e), s4 !== null) if (_3 === 0 || _3 === 10) _3 = 10;
      else return -2;
      return s4 != null ? (m4 = d2(_3, l3, p4, e, s4, o4), HEAPU32[a2 >> 2] = m4, 0) : n3 & 4 ? -2 : (e = DNS.lookup_name(e), s4 = inetPton4(e), _3 === 0 ? _3 = 2 : _3 === 10 && (s4 = [0, 0, _htonl(65535), s4]), m4 = d2(_3, l3, p4, null, s4, o4), HEAPU32[a2 >> 2] = m4, 0);
    };
    _getaddrinfo.sig = "ipppp";
    var _getnameinfo = (e, t2, r, a2, s4, o4, n3) => {
      var _3 = readSockaddr(e, t2);
      if (_3.errno) return -6;
      var l3 = _3.port, p4 = _3.addr, m4 = false;
      if (r && a2) {
        var d2;
        if (n3 & 1 || !(d2 = DNS.lookup_addr(p4))) {
          if (n3 & 8) return -2;
        } else p4 = d2;
        var g5 = stringToUTF8(p4, r, a2);
        g5 + 1 >= a2 && (m4 = true);
      }
      if (s4 && o4) {
        l3 = "" + l3;
        var g5 = stringToUTF8(l3, s4, o4);
        g5 + 1 >= o4 && (m4 = true);
      }
      return m4 ? -12 : 0;
    };
    _getnameinfo.sig = "ipipipii";
    var stringToNewUTF8 = (e) => {
      var t2 = lengthBytesUTF8(e) + 1, r = _malloc(t2);
      return r && stringToUTF8(e, r, t2), r;
    }, removeFunction = (e) => {
      functionsInTableMap.delete(getWasmTableEntry(e)), setWasmTableEntry(e, null), freeTableIndexes.push(e);
    }, FS_createPath = FS.createPath, FS_unlink = (e) => FS.unlink(e), FS_createLazyFile = FS.createLazyFile, FS_createDevice = FS.createDevice, setTempRet0 = (e) => __emscripten_tempret_set(e), _setTempRet0 = setTempRet0;
    Module._setTempRet0 = _setTempRet0;
    var getTempRet0 = (e) => __emscripten_tempret_get(), _getTempRet0 = getTempRet0;
    Module._getTempRet0 = _getTempRet0, registerWasmPlugin(), FS.createPreloadedFile = FS_createPreloadedFile, FS.staticInit(), Module.FS_createPath = FS.createPath, Module.FS_createDataFile = FS.createDataFile, Module.FS_createPreloadedFile = FS.createPreloadedFile, Module.FS_unlink = FS.unlink, Module.FS_createLazyFile = FS.createLazyFile, Module.FS_createDevice = FS.createDevice, MEMFS.doesNotExistError = new FS.ErrnoError(44), MEMFS.doesNotExistError.stack = "<generic error, no stack>", ENVIRONMENT_IS_NODE && NODEFS.staticInit();
    var wasmImports = { __assert_fail: ___assert_fail, __call_sighandler: ___call_sighandler, __heap_base: ___heap_base, __indirect_function_table: wasmTable, __memory_base: ___memory_base, __stack_pointer: ___stack_pointer, __syscall__newselect: ___syscall__newselect, __syscall_bind: ___syscall_bind, __syscall_chdir: ___syscall_chdir, __syscall_chmod: ___syscall_chmod, __syscall_dup: ___syscall_dup, __syscall_dup3: ___syscall_dup3, __syscall_faccessat: ___syscall_faccessat, __syscall_fadvise64: ___syscall_fadvise64, __syscall_fallocate: ___syscall_fallocate, __syscall_fcntl64: ___syscall_fcntl64, __syscall_fdatasync: ___syscall_fdatasync, __syscall_fstat64: ___syscall_fstat64, __syscall_ftruncate64: ___syscall_ftruncate64, __syscall_getcwd: ___syscall_getcwd, __syscall_getdents64: ___syscall_getdents64, __syscall_ioctl: ___syscall_ioctl, __syscall_lstat64: ___syscall_lstat64, __syscall_mkdirat: ___syscall_mkdirat, __syscall_newfstatat: ___syscall_newfstatat, __syscall_openat: ___syscall_openat, __syscall_pipe: ___syscall_pipe, __syscall_readlinkat: ___syscall_readlinkat, __syscall_recvfrom: ___syscall_recvfrom, __syscall_renameat: ___syscall_renameat, __syscall_rmdir: ___syscall_rmdir, __syscall_sendto: ___syscall_sendto, __syscall_socket: ___syscall_socket, __syscall_stat64: ___syscall_stat64, __syscall_symlinkat: ___syscall_symlinkat, __syscall_truncate64: ___syscall_truncate64, __syscall_unlinkat: ___syscall_unlinkat, __table_base: ___table_base, _abort_js: __abort_js, _dlopen_js: __dlopen_js, _dlsym_js: __dlsym_js, _emscripten_memcpy_js: __emscripten_memcpy_js, _emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear, _emscripten_system: __emscripten_system, _emscripten_throw_longjmp: __emscripten_throw_longjmp, _gmtime_js: __gmtime_js, _localtime_js: __localtime_js, _mmap_js: __mmap_js, _munmap_js: __munmap_js, _setitimer_js: __setitimer_js, _tzset_js: __tzset_js, clock_time_get: _clock_time_get, emscripten_asm_const_int: _emscripten_asm_const_int, emscripten_date_now: _emscripten_date_now, emscripten_force_exit: _emscripten_force_exit, emscripten_get_now: _emscripten_get_now, emscripten_resize_heap: _emscripten_resize_heap, environ_get: _environ_get, environ_sizes_get: _environ_sizes_get, exit: _exit, fd_close: _fd_close, fd_fdstat_get: _fd_fdstat_get, fd_pread: _fd_pread, fd_pwrite: _fd_pwrite, fd_read: _fd_read, fd_seek: _fd_seek, fd_sync: _fd_sync, fd_write: _fd_write, getTempRet0: _getTempRet0, getaddrinfo: _getaddrinfo, getnameinfo: _getnameinfo, invoke_di, invoke_i, invoke_id, invoke_ii, invoke_iii, invoke_iiii, invoke_iiiii, invoke_iiiiii, invoke_iiiiiii, invoke_iiiiiiii, invoke_iiiiiiiii, invoke_iiiiiiiiii, invoke_iiiiiiiiiii, invoke_iiiiiiiiiiiiii, invoke_iiiiiiiiiiiiiiiiii, invoke_iiiiiji, invoke_iiiij, invoke_iiiijii, invoke_iiij, invoke_iiji, invoke_ij, invoke_ijiiiii, invoke_ijiiiiii, invoke_j, invoke_ji, invoke_jii, invoke_jiiii, invoke_jiiiiii, invoke_jiiiiiiiii, invoke_v, invoke_vi, invoke_vid, invoke_vii, invoke_viii, invoke_viiii, invoke_viiiii, invoke_viiiiii, invoke_viiiiiii, invoke_viiiiiiii, invoke_viiiiiiiii, invoke_viiiiiiiiiiii, invoke_viiiji, invoke_viij, invoke_viiji, invoke_viijii, invoke_viijiiii, invoke_vij, invoke_viji, invoke_vijiji, invoke_vj, invoke_vji, memory: wasmMemory, proc_exit: _proc_exit, setTempRet0: _setTempRet0 }, wasmExports;
    createWasm();
    var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports.__wasm_call_ctors)(), _fflush = Module._fflush = (e) => (_fflush = Module._fflush = wasmExports.fflush)(e), ___errno_location = Module.___errno_location = () => (___errno_location = Module.___errno_location = wasmExports.__errno_location)(), _ProcessInterrupts = Module._ProcessInterrupts = () => (_ProcessInterrupts = Module._ProcessInterrupts = wasmExports.ProcessInterrupts)(), _errstart_cold = Module._errstart_cold = (e, t2) => (_errstart_cold = Module._errstart_cold = wasmExports.errstart_cold)(e, t2), _errcode = Module._errcode = (e) => (_errcode = Module._errcode = wasmExports.errcode)(e), _errmsg = Module._errmsg = (e, t2) => (_errmsg = Module._errmsg = wasmExports.errmsg)(e, t2), _errfinish = Module._errfinish = (e, t2, r) => (_errfinish = Module._errfinish = wasmExports.errfinish)(e, t2, r), _puts = Module._puts = (e) => (_puts = Module._puts = wasmExports.puts)(e), _errstart = Module._errstart = (e, t2) => (_errstart = Module._errstart = wasmExports.errstart)(e, t2), _errmsg_internal = Module._errmsg_internal = (e, t2) => (_errmsg_internal = Module._errmsg_internal = wasmExports.errmsg_internal)(e, t2), _errdetail = Module._errdetail = (e, t2) => (_errdetail = Module._errdetail = wasmExports.errdetail)(e, t2), _errhint = Module._errhint = (e, t2) => (_errhint = Module._errhint = wasmExports.errhint)(e, t2), _pg_parse_query = Module._pg_parse_query = (e) => (_pg_parse_query = Module._pg_parse_query = wasmExports.pg_parse_query)(e), _gettimeofday = Module._gettimeofday = (e, t2) => (_gettimeofday = Module._gettimeofday = wasmExports.gettimeofday)(e, t2), _raw_parser = Module._raw_parser = (e, t2) => (_raw_parser = Module._raw_parser = wasmExports.raw_parser)(e, t2), _initStringInfo = Module._initStringInfo = (e) => (_initStringInfo = Module._initStringInfo = wasmExports.initStringInfo)(e), _appendStringInfoString = Module._appendStringInfoString = (e, t2) => (_appendStringInfoString = Module._appendStringInfoString = wasmExports.appendStringInfoString)(e, t2), _appendStringInfo = Module._appendStringInfo = (e, t2, r) => (_appendStringInfo = Module._appendStringInfo = wasmExports.appendStringInfo)(e, t2, r), _errdetail_internal = Module._errdetail_internal = (e, t2) => (_errdetail_internal = Module._errdetail_internal = wasmExports.errdetail_internal)(e, t2), _pfree = Module._pfree = (e) => (_pfree = Module._pfree = wasmExports.pfree)(e), _list_make1_impl = Module._list_make1_impl = (e, t2) => (_list_make1_impl = Module._list_make1_impl = wasmExports.list_make1_impl)(e, t2), _QueryRewrite = Module._QueryRewrite = (e) => (_QueryRewrite = Module._QueryRewrite = wasmExports.QueryRewrite)(e), _pg_plan_query = Module._pg_plan_query = (e, t2, r, a2) => (_pg_plan_query = Module._pg_plan_query = wasmExports.pg_plan_query)(e, t2, r, a2), _palloc0 = Module._palloc0 = (e) => (_palloc0 = Module._palloc0 = wasmExports.palloc0)(e), _lappend = Module._lappend = (e, t2) => (_lappend = Module._lappend = wasmExports.lappend)(e, t2), _GetCurrentTimestamp = Module._GetCurrentTimestamp = () => (_GetCurrentTimestamp = Module._GetCurrentTimestamp = wasmExports.GetCurrentTimestamp)(), _pg_prng_double = Module._pg_prng_double = (e) => (_pg_prng_double = Module._pg_prng_double = wasmExports.pg_prng_double)(e), _pg_snprintf = Module._pg_snprintf = (e, t2, r, a2) => (_pg_snprintf = Module._pg_snprintf = wasmExports.pg_snprintf)(e, t2, r, a2), _die = Module._die = (e) => (_die = Module._die = wasmExports.die)(e), _check_stack_depth = Module._check_stack_depth = () => (_check_stack_depth = Module._check_stack_depth = wasmExports.check_stack_depth)(), _pre_format_elog_string = Module._pre_format_elog_string = (e, t2) => (_pre_format_elog_string = Module._pre_format_elog_string = wasmExports.pre_format_elog_string)(e, t2), _format_elog_string = Module._format_elog_string = (e, t2) => (_format_elog_string = Module._format_elog_string = wasmExports.format_elog_string)(e, t2), _pstrdup = Module._pstrdup = (e) => (_pstrdup = Module._pstrdup = wasmExports.pstrdup)(e), _SplitIdentifierString = Module._SplitIdentifierString = (e, t2, r) => (_SplitIdentifierString = Module._SplitIdentifierString = wasmExports.SplitIdentifierString)(e, t2, r), _list_free = Module._list_free = (e) => (_list_free = Module._list_free = wasmExports.list_free)(e), _pg_strcasecmp = Module._pg_strcasecmp = (e, t2) => (_pg_strcasecmp = Module._pg_strcasecmp = wasmExports.pg_strcasecmp)(e, t2), _guc_malloc = Module._guc_malloc = (e, t2) => (_guc_malloc = Module._guc_malloc = wasmExports.guc_malloc)(e, t2), _SetConfigOption = Module._SetConfigOption = (e, t2, r, a2) => (_SetConfigOption = Module._SetConfigOption = wasmExports.SetConfigOption)(e, t2, r, a2), _pg_sprintf = Module._pg_sprintf = (e, t2, r) => (_pg_sprintf = Module._pg_sprintf = wasmExports.pg_sprintf)(e, t2, r), _strcmp = Module._strcmp = (e, t2) => (_strcmp = Module._strcmp = wasmExports.strcmp)(e, t2), _atoi = Module._atoi = (e) => (_atoi = Module._atoi = wasmExports.atoi)(e), _pgl_shutdown = Module._pgl_shutdown = () => (_pgl_shutdown = Module._pgl_shutdown = wasmExports.pgl_shutdown)(), _pgl_closed = Module._pgl_closed = () => (_pgl_closed = Module._pgl_closed = wasmExports.pgl_closed)(), _MemoryContextReset = Module._MemoryContextReset = (e) => (_MemoryContextReset = Module._MemoryContextReset = wasmExports.MemoryContextReset)(e), _resetStringInfo = Module._resetStringInfo = (e) => (_resetStringInfo = Module._resetStringInfo = wasmExports.resetStringInfo)(e), _getc = Module._getc = (e) => (_getc = Module._getc = wasmExports.getc)(e), _appendStringInfoChar = Module._appendStringInfoChar = (e, t2) => (_appendStringInfoChar = Module._appendStringInfoChar = wasmExports.appendStringInfoChar)(e, t2), _strlen = Module._strlen = (e) => (_strlen = Module._strlen = wasmExports.strlen)(e), _strncmp = Module._strncmp = (e, t2, r) => (_strncmp = Module._strncmp = wasmExports.strncmp)(e, t2, r), _pg_fprintf = Module._pg_fprintf = (e, t2, r) => (_pg_fprintf = Module._pg_fprintf = wasmExports.pg_fprintf)(e, t2, r), _pgstat_report_activity = Module._pgstat_report_activity = (e, t2) => (_pgstat_report_activity = Module._pgstat_report_activity = wasmExports.pgstat_report_activity)(e, t2), _errhidestmt = Module._errhidestmt = (e) => (_errhidestmt = Module._errhidestmt = wasmExports.errhidestmt)(e), _GetTransactionSnapshot = Module._GetTransactionSnapshot = () => (_GetTransactionSnapshot = Module._GetTransactionSnapshot = wasmExports.GetTransactionSnapshot)(), _PushActiveSnapshot = Module._PushActiveSnapshot = (e) => (_PushActiveSnapshot = Module._PushActiveSnapshot = wasmExports.PushActiveSnapshot)(e), _AllocSetContextCreateInternal = Module._AllocSetContextCreateInternal = (e, t2, r, a2, s4) => (_AllocSetContextCreateInternal = Module._AllocSetContextCreateInternal = wasmExports.AllocSetContextCreateInternal)(e, t2, r, a2, s4), _PopActiveSnapshot = Module._PopActiveSnapshot = () => (_PopActiveSnapshot = Module._PopActiveSnapshot = wasmExports.PopActiveSnapshot)(), _CreateDestReceiver = Module._CreateDestReceiver = (e) => (_CreateDestReceiver = Module._CreateDestReceiver = wasmExports.CreateDestReceiver)(e), _CommitTransactionCommand = Module._CommitTransactionCommand = () => (_CommitTransactionCommand = Module._CommitTransactionCommand = wasmExports.CommitTransactionCommand)(), _CommandCounterIncrement = Module._CommandCounterIncrement = () => (_CommandCounterIncrement = Module._CommandCounterIncrement = wasmExports.CommandCounterIncrement)(), _MemoryContextDelete = Module._MemoryContextDelete = (e) => (_MemoryContextDelete = Module._MemoryContextDelete = wasmExports.MemoryContextDelete)(e), _StartTransactionCommand = Module._StartTransactionCommand = () => (_StartTransactionCommand = Module._StartTransactionCommand = wasmExports.StartTransactionCommand)(), ___wasm_setjmp_test = Module.___wasm_setjmp_test = (e, t2) => (___wasm_setjmp_test = Module.___wasm_setjmp_test = wasmExports.__wasm_setjmp_test)(e, t2), _pg_printf = Module._pg_printf = (e, t2) => (_pg_printf = Module._pg_printf = wasmExports.pg_printf)(e, t2), ___wasm_setjmp = Module.___wasm_setjmp = (e, t2, r) => (___wasm_setjmp = Module.___wasm_setjmp = wasmExports.__wasm_setjmp)(e, t2, r), _FlushErrorState = Module._FlushErrorState = () => (_FlushErrorState = Module._FlushErrorState = wasmExports.FlushErrorState)(), _emscripten_longjmp = Module._emscripten_longjmp = (e, t2) => (_emscripten_longjmp = Module._emscripten_longjmp = wasmExports.emscripten_longjmp)(e, t2), _enlargeStringInfo = Module._enlargeStringInfo = (e, t2) => (_enlargeStringInfo = Module._enlargeStringInfo = wasmExports.enlargeStringInfo)(e, t2), _malloc = Module._malloc = (e) => (_malloc = Module._malloc = wasmExports.malloc)(e), _realloc = Module._realloc = (e, t2) => (_realloc = Module._realloc = wasmExports.realloc)(e, t2), _strspn = Module._strspn = (e, t2) => (_strspn = Module._strspn = wasmExports.strspn)(e, t2), _memcpy = Module._memcpy = (e, t2, r) => (_memcpy = Module._memcpy = wasmExports.memcpy)(e, t2, r), _fileno = Module._fileno = (e) => (_fileno = Module._fileno = wasmExports.fileno)(e), _strchr = Module._strchr = (e, t2) => (_strchr = Module._strchr = wasmExports.strchr)(e, t2), _free = Module._free = (e) => (_free = Module._free = wasmExports.free)(e), _pg_vsnprintf = Module._pg_vsnprintf = (e, t2, r, a2) => (_pg_vsnprintf = Module._pg_vsnprintf = wasmExports.pg_vsnprintf)(e, t2, r, a2), _strcpy = Module._strcpy = (e, t2) => (_strcpy = Module._strcpy = wasmExports.strcpy)(e, t2), _psprintf = Module._psprintf = (e, t2) => (_psprintf = Module._psprintf = wasmExports.psprintf)(e, t2), _stat = Module._stat = (e, t2) => (_stat = Module._stat = wasmExports.stat)(e, t2), _fwrite = Module._fwrite = (e, t2, r, a2) => (_fwrite = Module._fwrite = wasmExports.fwrite)(e, t2, r, a2), _strftime = Module._strftime = (e, t2, r, a2) => (_strftime = Module._strftime = wasmExports.strftime)(e, t2, r, a2), _strstr = Module._strstr = (e, t2) => (_strstr = Module._strstr = wasmExports.strstr)(e, t2), _strtol = Module._strtol = (e, t2, r) => (_strtol = Module._strtol = wasmExports.strtol)(e, t2, r), _ferror = Module._ferror = (e) => (_ferror = Module._ferror = wasmExports.ferror)(e), _clear_error = Module._clear_error = () => (_clear_error = Module._clear_error = wasmExports.clear_error)(), _interactive_one = Module._interactive_one = (e, t2) => (_interactive_one = Module._interactive_one = wasmExports.interactive_one)(e, t2), _pq_getmsgint = Module._pq_getmsgint = (e, t2) => (_pq_getmsgint = Module._pq_getmsgint = wasmExports.pq_getmsgint)(e, t2), _palloc = Module._palloc = (e) => (_palloc = Module._palloc = wasmExports.palloc)(e), _makeParamList = Module._makeParamList = (e) => (_makeParamList = Module._makeParamList = wasmExports.makeParamList)(e), _getTypeInputInfo = Module._getTypeInputInfo = (e, t2, r) => (_getTypeInputInfo = Module._getTypeInputInfo = wasmExports.getTypeInputInfo)(e, t2, r), _pnstrdup = Module._pnstrdup = (e, t2) => (_pnstrdup = Module._pnstrdup = wasmExports.pnstrdup)(e, t2), _MemoryContextSetParent = Module._MemoryContextSetParent = (e, t2) => (_MemoryContextSetParent = Module._MemoryContextSetParent = wasmExports.MemoryContextSetParent)(e, t2), _pgl_backend = Module._pgl_backend = () => (_pgl_backend = Module._pgl_backend = wasmExports.pgl_backend)(), _pgl_initdb = Module._pgl_initdb = () => (_pgl_initdb = Module._pgl_initdb = wasmExports.pgl_initdb)(), _main = Module._main = (e, t2) => (_main = Module._main = wasmExports.__main_argc_argv)(e, t2), _appendStringInfoStringQuoted = Module._appendStringInfoStringQuoted = (e, t2, r) => (_appendStringInfoStringQuoted = Module._appendStringInfoStringQuoted = wasmExports.appendStringInfoStringQuoted)(e, t2, r), _set_errcontext_domain = Module._set_errcontext_domain = (e) => (_set_errcontext_domain = Module._set_errcontext_domain = wasmExports.set_errcontext_domain)(e), _errcontext_msg = Module._errcontext_msg = (e, t2) => (_errcontext_msg = Module._errcontext_msg = wasmExports.errcontext_msg)(e, t2), _memchr = Module._memchr = (e, t2, r) => (_memchr = Module._memchr = wasmExports.memchr)(e, t2, r), _strrchr = Module._strrchr = (e, t2) => (_strrchr = Module._strrchr = wasmExports.strrchr)(e, t2), _xsltFreeStylesheet = Module._xsltFreeStylesheet = (e) => (_xsltFreeStylesheet = Module._xsltFreeStylesheet = wasmExports.xsltFreeStylesheet)(e), _xsltParseStylesheetDoc = Module._xsltParseStylesheetDoc = (e) => (_xsltParseStylesheetDoc = Module._xsltParseStylesheetDoc = wasmExports.xsltParseStylesheetDoc)(e), _xsltSaveResultToString = Module._xsltSaveResultToString = (e, t2, r, a2) => (_xsltSaveResultToString = Module._xsltSaveResultToString = wasmExports.xsltSaveResultToString)(e, t2, r, a2), _xsltCleanupGlobals = Module._xsltCleanupGlobals = () => (_xsltCleanupGlobals = Module._xsltCleanupGlobals = wasmExports.xsltCleanupGlobals)(), _xsltNewTransformContext = Module._xsltNewTransformContext = (e, t2) => (_xsltNewTransformContext = Module._xsltNewTransformContext = wasmExports.xsltNewTransformContext)(e, t2), _xsltFreeTransformContext = Module._xsltFreeTransformContext = (e) => (_xsltFreeTransformContext = Module._xsltFreeTransformContext = wasmExports.xsltFreeTransformContext)(e), _xsltApplyStylesheetUser = Module._xsltApplyStylesheetUser = (e, t2, r, a2, s4, o4) => (_xsltApplyStylesheetUser = Module._xsltApplyStylesheetUser = wasmExports.xsltApplyStylesheetUser)(e, t2, r, a2, s4, o4), _xsltNewSecurityPrefs = Module._xsltNewSecurityPrefs = () => (_xsltNewSecurityPrefs = Module._xsltNewSecurityPrefs = wasmExports.xsltNewSecurityPrefs)(), _xsltFreeSecurityPrefs = Module._xsltFreeSecurityPrefs = (e) => (_xsltFreeSecurityPrefs = Module._xsltFreeSecurityPrefs = wasmExports.xsltFreeSecurityPrefs)(e), _xsltSetSecurityPrefs = Module._xsltSetSecurityPrefs = (e, t2, r) => (_xsltSetSecurityPrefs = Module._xsltSetSecurityPrefs = wasmExports.xsltSetSecurityPrefs)(e, t2, r), _xsltSetCtxtSecurityPrefs = Module._xsltSetCtxtSecurityPrefs = (e, t2) => (_xsltSetCtxtSecurityPrefs = Module._xsltSetCtxtSecurityPrefs = wasmExports.xsltSetCtxtSecurityPrefs)(e, t2), _xsltSecurityForbid = Module._xsltSecurityForbid = (e, t2, r) => (_xsltSecurityForbid = Module._xsltSecurityForbid = wasmExports.xsltSecurityForbid)(e, t2, r), _replace_percent_placeholders = Module._replace_percent_placeholders = (e, t2, r, a2) => (_replace_percent_placeholders = Module._replace_percent_placeholders = wasmExports.replace_percent_placeholders)(e, t2, r, a2), _memset = Module._memset = (e, t2, r) => (_memset = Module._memset = wasmExports.memset)(e, t2, r), _MemoryContextAllocZero = Module._MemoryContextAllocZero = (e, t2) => (_MemoryContextAllocZero = Module._MemoryContextAllocZero = wasmExports.MemoryContextAllocZero)(e, t2), _MemoryContextAllocExtended = Module._MemoryContextAllocExtended = (e, t2, r) => (_MemoryContextAllocExtended = Module._MemoryContextAllocExtended = wasmExports.MemoryContextAllocExtended)(e, t2, r), _hash_bytes = Module._hash_bytes = (e, t2) => (_hash_bytes = Module._hash_bytes = wasmExports.hash_bytes)(e, t2), _memcmp = Module._memcmp = (e, t2, r) => (_memcmp = Module._memcmp = wasmExports.memcmp)(e, t2, r), _repalloc = Module._repalloc = (e, t2) => (_repalloc = Module._repalloc = wasmExports.repalloc)(e, t2), _pg_qsort = Module._pg_qsort = (e, t2, r, a2) => (_pg_qsort = Module._pg_qsort = wasmExports.pg_qsort)(e, t2, r, a2), _OpenTransientFile = Module._OpenTransientFile = (e, t2) => (_OpenTransientFile = Module._OpenTransientFile = wasmExports.OpenTransientFile)(e, t2), _errcode_for_file_access = Module._errcode_for_file_access = () => (_errcode_for_file_access = Module._errcode_for_file_access = wasmExports.errcode_for_file_access)(), _read = Module._read = (e, t2, r) => (_read = Module._read = wasmExports.read)(e, t2, r), _CloseTransientFile = Module._CloseTransientFile = (e) => (_CloseTransientFile = Module._CloseTransientFile = wasmExports.CloseTransientFile)(e), _close = Module._close = (e) => (_close = Module._close = wasmExports.close)(e), ___multi3 = Module.___multi3 = (e, t2, r, a2, s4) => (___multi3 = Module.___multi3 = wasmExports.__multi3)(e, t2, r, a2, s4), _isalnum = Module._isalnum = (e) => (_isalnum = Module._isalnum = wasmExports.isalnum)(e), _wait_result_to_str = Module._wait_result_to_str = (e) => (_wait_result_to_str = Module._wait_result_to_str = wasmExports.wait_result_to_str)(e), _float_to_shortest_decimal_bufn = Module._float_to_shortest_decimal_bufn = (e, t2) => (_float_to_shortest_decimal_bufn = Module._float_to_shortest_decimal_bufn = wasmExports.float_to_shortest_decimal_bufn)(e, t2), _float_to_shortest_decimal_buf = Module._float_to_shortest_decimal_buf = (e, t2) => (_float_to_shortest_decimal_buf = Module._float_to_shortest_decimal_buf = wasmExports.float_to_shortest_decimal_buf)(e, t2), _memmove = Module._memmove = (e, t2, r) => (_memmove = Module._memmove = wasmExports.memmove)(e, t2, r), _pwrite = Module._pwrite = (e, t2, r, a2) => (_pwrite = Module._pwrite = wasmExports.pwrite)(e, t2, r, a2), _hash_bytes_extended = Module._hash_bytes_extended = (e, t2, r) => (_hash_bytes_extended = Module._hash_bytes_extended = wasmExports.hash_bytes_extended)(e, t2, r), _calloc = (e, t2) => (_calloc = wasmExports.calloc)(e, t2), _IsValidJsonNumber = Module._IsValidJsonNumber = (e, t2) => (_IsValidJsonNumber = Module._IsValidJsonNumber = wasmExports.IsValidJsonNumber)(e, t2), _appendBinaryStringInfo = Module._appendBinaryStringInfo = (e, t2, r) => (_appendBinaryStringInfo = Module._appendBinaryStringInfo = wasmExports.appendBinaryStringInfo)(e, t2, r), _makeStringInfo = Module._makeStringInfo = () => (_makeStringInfo = Module._makeStringInfo = wasmExports.makeStringInfo)(), _GetDatabaseEncodingName = Module._GetDatabaseEncodingName = () => (_GetDatabaseEncodingName = Module._GetDatabaseEncodingName = wasmExports.GetDatabaseEncodingName)(), _ScanKeywordLookup = Module._ScanKeywordLookup = (e, t2) => (_ScanKeywordLookup = Module._ScanKeywordLookup = wasmExports.ScanKeywordLookup)(e, t2), _strtoul = Module._strtoul = (e, t2, r) => (_strtoul = Module._strtoul = wasmExports.strtoul)(e, t2, r), _sscanf = Module._sscanf = (e, t2, r) => (_sscanf = Module._sscanf = wasmExports.sscanf)(e, t2, r), _pg_prng_uint64 = Module._pg_prng_uint64 = (e) => (_pg_prng_uint64 = Module._pg_prng_uint64 = wasmExports.pg_prng_uint64)(e), _pg_prng_uint32 = Module._pg_prng_uint32 = (e) => (_pg_prng_uint32 = Module._pg_prng_uint32 = wasmExports.pg_prng_uint32)(e), _log = Module._log = (e) => (_log = Module._log = wasmExports.log)(e), _sin = Module._sin = (e) => (_sin = Module._sin = wasmExports.sin)(e), _forkname_to_number = Module._forkname_to_number = (e) => (_forkname_to_number = Module._forkname_to_number = wasmExports.forkname_to_number)(e), _unlink = Module._unlink = (e) => (_unlink = Module._unlink = wasmExports.unlink)(e), _pg_utf_mblen_private = Module._pg_utf_mblen_private = (e) => (_pg_utf_mblen_private = Module._pg_utf_mblen_private = wasmExports.pg_utf_mblen_private)(e), _bsearch = Module._bsearch = (e, t2, r, a2, s4) => (_bsearch = Module._bsearch = wasmExports.bsearch)(e, t2, r, a2, s4), _palloc_extended = Module._palloc_extended = (e, t2) => (_palloc_extended = Module._palloc_extended = wasmExports.palloc_extended)(e, t2), _appendStringInfoSpaces = Module._appendStringInfoSpaces = (e, t2) => (_appendStringInfoSpaces = Module._appendStringInfoSpaces = wasmExports.appendStringInfoSpaces)(e, t2), _fcntl = Module._fcntl = (e, t2, r) => (_fcntl = Module._fcntl = wasmExports.fcntl)(e, t2, r), _pg_popcount_optimized = Module._pg_popcount_optimized = (e, t2) => (_pg_popcount_optimized = Module._pg_popcount_optimized = wasmExports.pg_popcount_optimized)(e, t2), _pg_strong_random = Module._pg_strong_random = (e, t2) => (_pg_strong_random = Module._pg_strong_random = wasmExports.pg_strong_random)(e, t2), _open = Module._open = (e, t2, r) => (_open = Module._open = wasmExports.open)(e, t2, r), _pg_usleep = Module._pg_usleep = (e) => (_pg_usleep = Module._pg_usleep = wasmExports.pg_usleep)(e), _nanosleep = Module._nanosleep = (e, t2) => (_nanosleep = Module._nanosleep = wasmExports.nanosleep)(e, t2), _getpid = Module._getpid = () => (_getpid = Module._getpid = wasmExports.getpid)(), _qsort_arg = Module._qsort_arg = (e, t2, r, a2, s4) => (_qsort_arg = Module._qsort_arg = wasmExports.qsort_arg)(e, t2, r, a2, s4), _RelationGetNumberOfBlocksInFork = Module._RelationGetNumberOfBlocksInFork = (e, t2) => (_RelationGetNumberOfBlocksInFork = Module._RelationGetNumberOfBlocksInFork = wasmExports.RelationGetNumberOfBlocksInFork)(e, t2), _ExtendBufferedRel = Module._ExtendBufferedRel = (e, t2, r, a2) => (_ExtendBufferedRel = Module._ExtendBufferedRel = wasmExports.ExtendBufferedRel)(e, t2, r, a2), _MarkBufferDirty = Module._MarkBufferDirty = (e) => (_MarkBufferDirty = Module._MarkBufferDirty = wasmExports.MarkBufferDirty)(e), _XLogBeginInsert = Module._XLogBeginInsert = () => (_XLogBeginInsert = Module._XLogBeginInsert = wasmExports.XLogBeginInsert)(), _XLogRegisterData = Module._XLogRegisterData = (e, t2) => (_XLogRegisterData = Module._XLogRegisterData = wasmExports.XLogRegisterData)(e, t2), _XLogInsert = Module._XLogInsert = (e, t2) => (_XLogInsert = Module._XLogInsert = wasmExports.XLogInsert)(e, t2), _UnlockReleaseBuffer = Module._UnlockReleaseBuffer = (e) => (_UnlockReleaseBuffer = Module._UnlockReleaseBuffer = wasmExports.UnlockReleaseBuffer)(e), _brin_build_desc = Module._brin_build_desc = (e) => (_brin_build_desc = Module._brin_build_desc = wasmExports.brin_build_desc)(e), _EnterParallelMode = Module._EnterParallelMode = () => (_EnterParallelMode = Module._EnterParallelMode = wasmExports.EnterParallelMode)(), _CreateParallelContext = Module._CreateParallelContext = (e, t2, r) => (_CreateParallelContext = Module._CreateParallelContext = wasmExports.CreateParallelContext)(e, t2, r), _RegisterSnapshot = Module._RegisterSnapshot = (e) => (_RegisterSnapshot = Module._RegisterSnapshot = wasmExports.RegisterSnapshot)(e), _table_parallelscan_estimate = Module._table_parallelscan_estimate = (e, t2) => (_table_parallelscan_estimate = Module._table_parallelscan_estimate = wasmExports.table_parallelscan_estimate)(e, t2), _add_size = Module._add_size = (e, t2) => (_add_size = Module._add_size = wasmExports.add_size)(e, t2), _tuplesort_estimate_shared = Module._tuplesort_estimate_shared = (e) => (_tuplesort_estimate_shared = Module._tuplesort_estimate_shared = wasmExports.tuplesort_estimate_shared)(e), _InitializeParallelDSM = Module._InitializeParallelDSM = (e) => (_InitializeParallelDSM = Module._InitializeParallelDSM = wasmExports.InitializeParallelDSM)(e), _UnregisterSnapshot = Module._UnregisterSnapshot = (e) => (_UnregisterSnapshot = Module._UnregisterSnapshot = wasmExports.UnregisterSnapshot)(e), _DestroyParallelContext = Module._DestroyParallelContext = (e) => (_DestroyParallelContext = Module._DestroyParallelContext = wasmExports.DestroyParallelContext)(e), _ExitParallelMode = Module._ExitParallelMode = () => (_ExitParallelMode = Module._ExitParallelMode = wasmExports.ExitParallelMode)(), _shm_toc_allocate = Module._shm_toc_allocate = (e, t2) => (_shm_toc_allocate = Module._shm_toc_allocate = wasmExports.shm_toc_allocate)(e, t2), _ConditionVariableInit = Module._ConditionVariableInit = (e) => (_ConditionVariableInit = Module._ConditionVariableInit = wasmExports.ConditionVariableInit)(e), _s_init_lock_sema = Module._s_init_lock_sema = (e, t2) => (_s_init_lock_sema = Module._s_init_lock_sema = wasmExports.s_init_lock_sema)(e, t2), _table_parallelscan_initialize = Module._table_parallelscan_initialize = (e, t2, r) => (_table_parallelscan_initialize = Module._table_parallelscan_initialize = wasmExports.table_parallelscan_initialize)(e, t2, r), _tuplesort_initialize_shared = Module._tuplesort_initialize_shared = (e, t2, r) => (_tuplesort_initialize_shared = Module._tuplesort_initialize_shared = wasmExports.tuplesort_initialize_shared)(e, t2, r), _shm_toc_insert = Module._shm_toc_insert = (e, t2, r) => (_shm_toc_insert = Module._shm_toc_insert = wasmExports.shm_toc_insert)(e, t2, r), _LaunchParallelWorkers = Module._LaunchParallelWorkers = (e) => (_LaunchParallelWorkers = Module._LaunchParallelWorkers = wasmExports.LaunchParallelWorkers)(e), _WaitForParallelWorkersToAttach = Module._WaitForParallelWorkersToAttach = (e) => (_WaitForParallelWorkersToAttach = Module._WaitForParallelWorkersToAttach = wasmExports.WaitForParallelWorkersToAttach)(e), _tas_sema = Module._tas_sema = (e) => (_tas_sema = Module._tas_sema = wasmExports.tas_sema)(e), _s_lock = Module._s_lock = (e, t2, r, a2) => (_s_lock = Module._s_lock = wasmExports.s_lock)(e, t2, r, a2), _s_unlock_sema = Module._s_unlock_sema = (e) => (_s_unlock_sema = Module._s_unlock_sema = wasmExports.s_unlock_sema)(e), _ConditionVariableSleep = Module._ConditionVariableSleep = (e, t2) => (_ConditionVariableSleep = Module._ConditionVariableSleep = wasmExports.ConditionVariableSleep)(e, t2), _ConditionVariableCancelSleep = Module._ConditionVariableCancelSleep = () => (_ConditionVariableCancelSleep = Module._ConditionVariableCancelSleep = wasmExports.ConditionVariableCancelSleep)(), _tuplesort_performsort = Module._tuplesort_performsort = (e) => (_tuplesort_performsort = Module._tuplesort_performsort = wasmExports.tuplesort_performsort)(e), _tuplesort_end = Module._tuplesort_end = (e) => (_tuplesort_end = Module._tuplesort_end = wasmExports.tuplesort_end)(e), _brin_deform_tuple = Module._brin_deform_tuple = (e, t2, r) => (_brin_deform_tuple = Module._brin_deform_tuple = wasmExports.brin_deform_tuple)(e, t2, r), _log_newpage_buffer = Module._log_newpage_buffer = (e, t2) => (_log_newpage_buffer = Module._log_newpage_buffer = wasmExports.log_newpage_buffer)(e, t2), _LockBuffer = Module._LockBuffer = (e, t2) => (_LockBuffer = Module._LockBuffer = wasmExports.LockBuffer)(e, t2), _ReleaseBuffer = Module._ReleaseBuffer = (e) => (_ReleaseBuffer = Module._ReleaseBuffer = wasmExports.ReleaseBuffer)(e), _IndexGetRelation = Module._IndexGetRelation = (e, t2) => (_IndexGetRelation = Module._IndexGetRelation = wasmExports.IndexGetRelation)(e, t2), _table_open = Module._table_open = (e, t2) => (_table_open = Module._table_open = wasmExports.table_open)(e, t2), _ReadBufferExtended = Module._ReadBufferExtended = (e, t2, r, a2, s4) => (_ReadBufferExtended = Module._ReadBufferExtended = wasmExports.ReadBufferExtended)(e, t2, r, a2, s4), _table_close = Module._table_close = (e, t2) => (_table_close = Module._table_close = wasmExports.table_close)(e, t2), _build_reloptions = Module._build_reloptions = (e, t2, r, a2, s4, o4) => (_build_reloptions = Module._build_reloptions = wasmExports.build_reloptions)(e, t2, r, a2, s4, o4), _RelationGetIndexScan = Module._RelationGetIndexScan = (e, t2, r) => (_RelationGetIndexScan = Module._RelationGetIndexScan = wasmExports.RelationGetIndexScan)(e, t2, r), _pgstat_assoc_relation = Module._pgstat_assoc_relation = (e) => (_pgstat_assoc_relation = Module._pgstat_assoc_relation = wasmExports.pgstat_assoc_relation)(e), _index_getprocinfo = Module._index_getprocinfo = (e, t2, r) => (_index_getprocinfo = Module._index_getprocinfo = wasmExports.index_getprocinfo)(e, t2, r), _fmgr_info_copy = Module._fmgr_info_copy = (e, t2, r) => (_fmgr_info_copy = Module._fmgr_info_copy = wasmExports.fmgr_info_copy)(e, t2, r), _FunctionCall4Coll = Module._FunctionCall4Coll = (e, t2, r, a2, s4, o4) => (_FunctionCall4Coll = Module._FunctionCall4Coll = wasmExports.FunctionCall4Coll)(e, t2, r, a2, s4, o4), _FunctionCall1Coll = Module._FunctionCall1Coll = (e, t2, r) => (_FunctionCall1Coll = Module._FunctionCall1Coll = wasmExports.FunctionCall1Coll)(e, t2, r), _brin_free_desc = Module._brin_free_desc = (e) => (_brin_free_desc = Module._brin_free_desc = wasmExports.brin_free_desc)(e), _WaitForParallelWorkersToFinish = Module._WaitForParallelWorkersToFinish = (e) => (_WaitForParallelWorkersToFinish = Module._WaitForParallelWorkersToFinish = wasmExports.WaitForParallelWorkersToFinish)(e), _PageGetFreeSpace = Module._PageGetFreeSpace = (e) => (_PageGetFreeSpace = Module._PageGetFreeSpace = wasmExports.PageGetFreeSpace)(e), _BufferGetBlockNumber = Module._BufferGetBlockNumber = (e) => (_BufferGetBlockNumber = Module._BufferGetBlockNumber = wasmExports.BufferGetBlockNumber)(e), _BuildIndexInfo = Module._BuildIndexInfo = (e) => (_BuildIndexInfo = Module._BuildIndexInfo = wasmExports.BuildIndexInfo)(e), _Int64GetDatum = Module._Int64GetDatum = (e) => (_Int64GetDatum = Module._Int64GetDatum = wasmExports.Int64GetDatum)(e), _DirectFunctionCall2Coll = Module._DirectFunctionCall2Coll = (e, t2, r, a2) => (_DirectFunctionCall2Coll = Module._DirectFunctionCall2Coll = wasmExports.DirectFunctionCall2Coll)(e, t2, r, a2), _RecoveryInProgress = Module._RecoveryInProgress = () => (_RecoveryInProgress = Module._RecoveryInProgress = wasmExports.RecoveryInProgress)(), _GetUserIdAndSecContext = Module._GetUserIdAndSecContext = (e, t2) => (_GetUserIdAndSecContext = Module._GetUserIdAndSecContext = wasmExports.GetUserIdAndSecContext)(e, t2), _SetUserIdAndSecContext = Module._SetUserIdAndSecContext = (e, t2) => (_SetUserIdAndSecContext = Module._SetUserIdAndSecContext = wasmExports.SetUserIdAndSecContext)(e, t2), _NewGUCNestLevel = Module._NewGUCNestLevel = () => (_NewGUCNestLevel = Module._NewGUCNestLevel = wasmExports.NewGUCNestLevel)(), _RestrictSearchPath = Module._RestrictSearchPath = () => (_RestrictSearchPath = Module._RestrictSearchPath = wasmExports.RestrictSearchPath)(), _index_open = Module._index_open = (e, t2) => (_index_open = Module._index_open = wasmExports.index_open)(e, t2), _object_ownercheck = Module._object_ownercheck = (e, t2, r) => (_object_ownercheck = Module._object_ownercheck = wasmExports.object_ownercheck)(e, t2, r), _aclcheck_error = Module._aclcheck_error = (e, t2, r) => (_aclcheck_error = Module._aclcheck_error = wasmExports.aclcheck_error)(e, t2, r), _AtEOXact_GUC = Module._AtEOXact_GUC = (e, t2) => (_AtEOXact_GUC = Module._AtEOXact_GUC = wasmExports.AtEOXact_GUC)(e, t2), _relation_close = Module._relation_close = (e, t2) => (_relation_close = Module._relation_close = wasmExports.relation_close)(e, t2), _GetUserId = Module._GetUserId = () => (_GetUserId = Module._GetUserId = wasmExports.GetUserId)(), _ReadBuffer = Module._ReadBuffer = (e, t2) => (_ReadBuffer = Module._ReadBuffer = wasmExports.ReadBuffer)(e, t2), _shm_toc_lookup = Module._shm_toc_lookup = (e, t2, r) => (_shm_toc_lookup = Module._shm_toc_lookup = wasmExports.shm_toc_lookup)(e, t2, r), _tuplesort_attach_shared = Module._tuplesort_attach_shared = (e, t2) => (_tuplesort_attach_shared = Module._tuplesort_attach_shared = wasmExports.tuplesort_attach_shared)(e, t2), _index_close = Module._index_close = (e, t2) => (_index_close = Module._index_close = wasmExports.index_close)(e, t2), _table_beginscan_parallel = Module._table_beginscan_parallel = (e, t2) => (_table_beginscan_parallel = Module._table_beginscan_parallel = wasmExports.table_beginscan_parallel)(e, t2), _ConditionVariableSignal = Module._ConditionVariableSignal = (e) => (_ConditionVariableSignal = Module._ConditionVariableSignal = wasmExports.ConditionVariableSignal)(e), _datumCopy = Module._datumCopy = (e, t2, r) => (_datumCopy = Module._datumCopy = wasmExports.datumCopy)(e, t2, r), _lookup_type_cache = Module._lookup_type_cache = (e, t2) => (_lookup_type_cache = Module._lookup_type_cache = wasmExports.lookup_type_cache)(e, t2), _get_fn_opclass_options = Module._get_fn_opclass_options = (e) => (_get_fn_opclass_options = Module._get_fn_opclass_options = wasmExports.get_fn_opclass_options)(e), _pg_detoast_datum = Module._pg_detoast_datum = (e) => (_pg_detoast_datum = Module._pg_detoast_datum = wasmExports.pg_detoast_datum)(e), _index_getprocid = Module._index_getprocid = (e, t2, r) => (_index_getprocid = Module._index_getprocid = wasmExports.index_getprocid)(e, t2, r), _init_local_reloptions = Module._init_local_reloptions = (e, t2) => (_init_local_reloptions = Module._init_local_reloptions = wasmExports.init_local_reloptions)(e, t2), _FunctionCall2Coll = Module._FunctionCall2Coll = (e, t2, r, a2) => (_FunctionCall2Coll = Module._FunctionCall2Coll = wasmExports.FunctionCall2Coll)(e, t2, r, a2), _SysCacheGetAttrNotNull = Module._SysCacheGetAttrNotNull = (e, t2, r) => (_SysCacheGetAttrNotNull = Module._SysCacheGetAttrNotNull = wasmExports.SysCacheGetAttrNotNull)(e, t2, r), _ReleaseSysCache = Module._ReleaseSysCache = (e) => (_ReleaseSysCache = Module._ReleaseSysCache = wasmExports.ReleaseSysCache)(e), _fmgr_info_cxt = Module._fmgr_info_cxt = (e, t2, r) => (_fmgr_info_cxt = Module._fmgr_info_cxt = wasmExports.fmgr_info_cxt)(e, t2, r), _Float8GetDatum = Module._Float8GetDatum = (e) => (_Float8GetDatum = Module._Float8GetDatum = wasmExports.Float8GetDatum)(e), _numeric_sub = Module._numeric_sub = (e) => (_numeric_sub = Module._numeric_sub = wasmExports.numeric_sub)(e), _DirectFunctionCall1Coll = Module._DirectFunctionCall1Coll = (e, t2, r) => (_DirectFunctionCall1Coll = Module._DirectFunctionCall1Coll = wasmExports.DirectFunctionCall1Coll)(e, t2, r), _pg_detoast_datum_packed = Module._pg_detoast_datum_packed = (e) => (_pg_detoast_datum_packed = Module._pg_detoast_datum_packed = wasmExports.pg_detoast_datum_packed)(e), _add_local_int_reloption = Module._add_local_int_reloption = (e, t2, r, a2, s4, o4, n3) => (_add_local_int_reloption = Module._add_local_int_reloption = wasmExports.add_local_int_reloption)(e, t2, r, a2, s4, o4, n3), _getTypeOutputInfo = Module._getTypeOutputInfo = (e, t2, r) => (_getTypeOutputInfo = Module._getTypeOutputInfo = wasmExports.getTypeOutputInfo)(e, t2, r), _fmgr_info = Module._fmgr_info = (e, t2) => (_fmgr_info = Module._fmgr_info = wasmExports.fmgr_info)(e, t2), _OutputFunctionCall = Module._OutputFunctionCall = (e, t2) => (_OutputFunctionCall = Module._OutputFunctionCall = wasmExports.OutputFunctionCall)(e, t2), _cstring_to_text_with_len = Module._cstring_to_text_with_len = (e, t2) => (_cstring_to_text_with_len = Module._cstring_to_text_with_len = wasmExports.cstring_to_text_with_len)(e, t2), _accumArrayResult = Module._accumArrayResult = (e, t2, r, a2, s4) => (_accumArrayResult = Module._accumArrayResult = wasmExports.accumArrayResult)(e, t2, r, a2, s4), _makeArrayResult = Module._makeArrayResult = (e, t2) => (_makeArrayResult = Module._makeArrayResult = wasmExports.makeArrayResult)(e, t2), _OidOutputFunctionCall = Module._OidOutputFunctionCall = (e, t2) => (_OidOutputFunctionCall = Module._OidOutputFunctionCall = wasmExports.OidOutputFunctionCall)(e, t2), _cstring_to_text = Module._cstring_to_text = (e) => (_cstring_to_text = Module._cstring_to_text = wasmExports.cstring_to_text)(e), _PageGetExactFreeSpace = Module._PageGetExactFreeSpace = (e) => (_PageGetExactFreeSpace = Module._PageGetExactFreeSpace = wasmExports.PageGetExactFreeSpace)(e), _PageIndexTupleOverwrite = Module._PageIndexTupleOverwrite = (e, t2, r, a2) => (_PageIndexTupleOverwrite = Module._PageIndexTupleOverwrite = wasmExports.PageIndexTupleOverwrite)(e, t2, r, a2), _PageInit = Module._PageInit = (e, t2, r) => (_PageInit = Module._PageInit = wasmExports.PageInit)(e, t2, r), _PageAddItemExtended = Module._PageAddItemExtended = (e, t2, r, a2, s4) => (_PageAddItemExtended = Module._PageAddItemExtended = wasmExports.PageAddItemExtended)(e, t2, r, a2, s4), _LockRelationForExtension = Module._LockRelationForExtension = (e, t2) => (_LockRelationForExtension = Module._LockRelationForExtension = wasmExports.LockRelationForExtension)(e, t2), _UnlockRelationForExtension = Module._UnlockRelationForExtension = (e, t2) => (_UnlockRelationForExtension = Module._UnlockRelationForExtension = wasmExports.UnlockRelationForExtension)(e, t2), _smgropen = Module._smgropen = (e, t2) => (_smgropen = Module._smgropen = wasmExports.smgropen)(e, t2), _smgrpin = Module._smgrpin = (e) => (_smgrpin = Module._smgrpin = wasmExports.smgrpin)(e), _ItemPointerEquals = Module._ItemPointerEquals = (e, t2) => (_ItemPointerEquals = Module._ItemPointerEquals = wasmExports.ItemPointerEquals)(e, t2), _detoast_external_attr = Module._detoast_external_attr = (e) => (_detoast_external_attr = Module._detoast_external_attr = wasmExports.detoast_external_attr)(e), _CreateTemplateTupleDesc = Module._CreateTemplateTupleDesc = (e) => (_CreateTemplateTupleDesc = Module._CreateTemplateTupleDesc = wasmExports.CreateTemplateTupleDesc)(e), _TupleDescInitEntry = Module._TupleDescInitEntry = (e, t2, r, a2, s4, o4) => (_TupleDescInitEntry = Module._TupleDescInitEntry = wasmExports.TupleDescInitEntry)(e, t2, r, a2, s4, o4), _SearchSysCache1 = Module._SearchSysCache1 = (e, t2) => (_SearchSysCache1 = Module._SearchSysCache1 = wasmExports.SearchSysCache1)(e, t2), _SearchSysCacheList = Module._SearchSysCacheList = (e, t2, r, a2, s4) => (_SearchSysCacheList = Module._SearchSysCacheList = wasmExports.SearchSysCacheList)(e, t2, r, a2, s4), _check_amproc_signature = Module._check_amproc_signature = (e, t2, r, a2, s4, o4) => (_check_amproc_signature = Module._check_amproc_signature = wasmExports.check_amproc_signature)(e, t2, r, a2, s4, o4), _check_amoptsproc_signature = Module._check_amoptsproc_signature = (e) => (_check_amoptsproc_signature = Module._check_amoptsproc_signature = wasmExports.check_amoptsproc_signature)(e), _format_procedure = Module._format_procedure = (e) => (_format_procedure = Module._format_procedure = wasmExports.format_procedure)(e), _format_operator = Module._format_operator = (e) => (_format_operator = Module._format_operator = wasmExports.format_operator)(e), _check_amop_signature = Module._check_amop_signature = (e, t2, r, a2) => (_check_amop_signature = Module._check_amop_signature = wasmExports.check_amop_signature)(e, t2, r, a2), _identify_opfamily_groups = Module._identify_opfamily_groups = (e, t2) => (_identify_opfamily_groups = Module._identify_opfamily_groups = wasmExports.identify_opfamily_groups)(e, t2), _format_type_be = Module._format_type_be = (e) => (_format_type_be = Module._format_type_be = wasmExports.format_type_be)(e), _ReleaseCatCacheList = Module._ReleaseCatCacheList = (e) => (_ReleaseCatCacheList = Module._ReleaseCatCacheList = wasmExports.ReleaseCatCacheList)(e), _format_type_with_typemod = Module._format_type_with_typemod = (e, t2) => (_format_type_with_typemod = Module._format_type_with_typemod = wasmExports.format_type_with_typemod)(e, t2), _DatumGetEOHP = Module._DatumGetEOHP = (e) => (_DatumGetEOHP = Module._DatumGetEOHP = wasmExports.DatumGetEOHP)(e), _EOH_get_flat_size = Module._EOH_get_flat_size = (e) => (_EOH_get_flat_size = Module._EOH_get_flat_size = wasmExports.EOH_get_flat_size)(e), _EOH_flatten_into = Module._EOH_flatten_into = (e, t2, r) => (_EOH_flatten_into = Module._EOH_flatten_into = wasmExports.EOH_flatten_into)(e, t2, r), _getmissingattr = Module._getmissingattr = (e, t2, r) => (_getmissingattr = Module._getmissingattr = wasmExports.getmissingattr)(e, t2, r), _hash_create = Module._hash_create = (e, t2, r, a2) => (_hash_create = Module._hash_create = wasmExports.hash_create)(e, t2, r, a2), _hash_search = Module._hash_search = (e, t2, r, a2) => (_hash_search = Module._hash_search = wasmExports.hash_search)(e, t2, r, a2), _nocachegetattr = Module._nocachegetattr = (e, t2, r) => (_nocachegetattr = Module._nocachegetattr = wasmExports.nocachegetattr)(e, t2, r), _heap_form_tuple = Module._heap_form_tuple = (e, t2, r) => (_heap_form_tuple = Module._heap_form_tuple = wasmExports.heap_form_tuple)(e, t2, r), _heap_modify_tuple = Module._heap_modify_tuple = (e, t2, r, a2, s4) => (_heap_modify_tuple = Module._heap_modify_tuple = wasmExports.heap_modify_tuple)(e, t2, r, a2, s4), _heap_deform_tuple = Module._heap_deform_tuple = (e, t2, r, a2) => (_heap_deform_tuple = Module._heap_deform_tuple = wasmExports.heap_deform_tuple)(e, t2, r, a2), _heap_modify_tuple_by_cols = Module._heap_modify_tuple_by_cols = (e, t2, r, a2, s4, o4) => (_heap_modify_tuple_by_cols = Module._heap_modify_tuple_by_cols = wasmExports.heap_modify_tuple_by_cols)(e, t2, r, a2, s4, o4), _heap_freetuple = Module._heap_freetuple = (e) => (_heap_freetuple = Module._heap_freetuple = wasmExports.heap_freetuple)(e), _index_form_tuple = Module._index_form_tuple = (e, t2, r) => (_index_form_tuple = Module._index_form_tuple = wasmExports.index_form_tuple)(e, t2, r), _nocache_index_getattr = Module._nocache_index_getattr = (e, t2, r) => (_nocache_index_getattr = Module._nocache_index_getattr = wasmExports.nocache_index_getattr)(e, t2, r), _index_deform_tuple = Module._index_deform_tuple = (e, t2, r, a2) => (_index_deform_tuple = Module._index_deform_tuple = wasmExports.index_deform_tuple)(e, t2, r, a2), _slot_getsomeattrs_int = Module._slot_getsomeattrs_int = (e, t2) => (_slot_getsomeattrs_int = Module._slot_getsomeattrs_int = wasmExports.slot_getsomeattrs_int)(e, t2), _pg_ltoa = Module._pg_ltoa = (e, t2) => (_pg_ltoa = Module._pg_ltoa = wasmExports.pg_ltoa)(e, t2), _relation_open = Module._relation_open = (e, t2) => (_relation_open = Module._relation_open = wasmExports.relation_open)(e, t2), _LockRelationOid = Module._LockRelationOid = (e, t2) => (_LockRelationOid = Module._LockRelationOid = wasmExports.LockRelationOid)(e, t2), _try_relation_open = Module._try_relation_open = (e, t2) => (_try_relation_open = Module._try_relation_open = wasmExports.try_relation_open)(e, t2), _relation_openrv = Module._relation_openrv = (e, t2) => (_relation_openrv = Module._relation_openrv = wasmExports.relation_openrv)(e, t2), _RangeVarGetRelidExtended = Module._RangeVarGetRelidExtended = (e, t2, r, a2, s4) => (_RangeVarGetRelidExtended = Module._RangeVarGetRelidExtended = wasmExports.RangeVarGetRelidExtended)(e, t2, r, a2, s4), _add_reloption_kind = Module._add_reloption_kind = () => (_add_reloption_kind = Module._add_reloption_kind = wasmExports.add_reloption_kind)(), _register_reloptions_validator = Module._register_reloptions_validator = (e, t2) => (_register_reloptions_validator = Module._register_reloptions_validator = wasmExports.register_reloptions_validator)(e, t2), _add_int_reloption = Module._add_int_reloption = (e, t2, r, a2, s4, o4, n3) => (_add_int_reloption = Module._add_int_reloption = wasmExports.add_int_reloption)(e, t2, r, a2, s4, o4, n3), _MemoryContextStrdup = Module._MemoryContextStrdup = (e, t2) => (_MemoryContextStrdup = Module._MemoryContextStrdup = wasmExports.MemoryContextStrdup)(e, t2), _transformRelOptions = Module._transformRelOptions = (e, t2, r, a2, s4, o4) => (_transformRelOptions = Module._transformRelOptions = wasmExports.transformRelOptions)(e, t2, r, a2, s4, o4), _deconstruct_array_builtin = Module._deconstruct_array_builtin = (e, t2, r, a2, s4) => (_deconstruct_array_builtin = Module._deconstruct_array_builtin = wasmExports.deconstruct_array_builtin)(e, t2, r, a2, s4), _defGetString = Module._defGetString = (e) => (_defGetString = Module._defGetString = wasmExports.defGetString)(e), _defGetBoolean = Module._defGetBoolean = (e) => (_defGetBoolean = Module._defGetBoolean = wasmExports.defGetBoolean)(e), _untransformRelOptions = Module._untransformRelOptions = (e) => (_untransformRelOptions = Module._untransformRelOptions = wasmExports.untransformRelOptions)(e), _text_to_cstring = Module._text_to_cstring = (e) => (_text_to_cstring = Module._text_to_cstring = wasmExports.text_to_cstring)(e), _makeString = Module._makeString = (e) => (_makeString = Module._makeString = wasmExports.makeString)(e), _makeDefElem = Module._makeDefElem = (e, t2, r) => (_makeDefElem = Module._makeDefElem = wasmExports.makeDefElem)(e, t2, r), _heap_reloptions = Module._heap_reloptions = (e, t2, r) => (_heap_reloptions = Module._heap_reloptions = wasmExports.heap_reloptions)(e, t2, r), _MemoryContextAlloc = Module._MemoryContextAlloc = (e, t2) => (_MemoryContextAlloc = Module._MemoryContextAlloc = wasmExports.MemoryContextAlloc)(e, t2), _parse_bool = Module._parse_bool = (e, t2) => (_parse_bool = Module._parse_bool = wasmExports.parse_bool)(e, t2), _parse_int = Module._parse_int = (e, t2, r, a2) => (_parse_int = Module._parse_int = wasmExports.parse_int)(e, t2, r, a2), _parse_real = Module._parse_real = (e, t2, r, a2) => (_parse_real = Module._parse_real = wasmExports.parse_real)(e, t2, r, a2), _ScanKeyInit = Module._ScanKeyInit = (e, t2, r, a2, s4) => (_ScanKeyInit = Module._ScanKeyInit = wasmExports.ScanKeyInit)(e, t2, r, a2, s4), _dsm_segment_handle = Module._dsm_segment_handle = (e) => (_dsm_segment_handle = Module._dsm_segment_handle = wasmExports.dsm_segment_handle)(e), _dsm_create = Module._dsm_create = (e, t2) => (_dsm_create = Module._dsm_create = wasmExports.dsm_create)(e, t2), _dsm_segment_address = Module._dsm_segment_address = (e) => (_dsm_segment_address = Module._dsm_segment_address = wasmExports.dsm_segment_address)(e), _dsm_attach = Module._dsm_attach = (e) => (_dsm_attach = Module._dsm_attach = wasmExports.dsm_attach)(e), _dsm_detach = Module._dsm_detach = (e) => (_dsm_detach = Module._dsm_detach = wasmExports.dsm_detach)(e), _ShmemInitStruct = Module._ShmemInitStruct = (e, t2, r) => (_ShmemInitStruct = Module._ShmemInitStruct = wasmExports.ShmemInitStruct)(e, t2, r), _LWLockAcquire = Module._LWLockAcquire = (e, t2) => (_LWLockAcquire = Module._LWLockAcquire = wasmExports.LWLockAcquire)(e, t2), _LWLockRelease = Module._LWLockRelease = (e) => (_LWLockRelease = Module._LWLockRelease = wasmExports.LWLockRelease)(e), _LWLockInitialize = Module._LWLockInitialize = (e, t2) => (_LWLockInitialize = Module._LWLockInitialize = wasmExports.LWLockInitialize)(e, t2), _MemoryContextMemAllocated = Module._MemoryContextMemAllocated = (e, t2) => (_MemoryContextMemAllocated = Module._MemoryContextMemAllocated = wasmExports.MemoryContextMemAllocated)(e, t2), _GetCurrentCommandId = Module._GetCurrentCommandId = (e) => (_GetCurrentCommandId = Module._GetCurrentCommandId = wasmExports.GetCurrentCommandId)(e), _toast_open_indexes = Module._toast_open_indexes = (e, t2, r, a2) => (_toast_open_indexes = Module._toast_open_indexes = wasmExports.toast_open_indexes)(e, t2, r, a2), _RelationGetIndexList = Module._RelationGetIndexList = (e) => (_RelationGetIndexList = Module._RelationGetIndexList = wasmExports.RelationGetIndexList)(e), _systable_beginscan = Module._systable_beginscan = (e, t2, r, a2, s4, o4) => (_systable_beginscan = Module._systable_beginscan = wasmExports.systable_beginscan)(e, t2, r, a2, s4, o4), _systable_getnext = Module._systable_getnext = (e) => (_systable_getnext = Module._systable_getnext = wasmExports.systable_getnext)(e), _systable_endscan = Module._systable_endscan = (e) => (_systable_endscan = Module._systable_endscan = wasmExports.systable_endscan)(e), _toast_close_indexes = Module._toast_close_indexes = (e, t2, r) => (_toast_close_indexes = Module._toast_close_indexes = wasmExports.toast_close_indexes)(e, t2, r), _systable_beginscan_ordered = Module._systable_beginscan_ordered = (e, t2, r, a2, s4) => (_systable_beginscan_ordered = Module._systable_beginscan_ordered = wasmExports.systable_beginscan_ordered)(e, t2, r, a2, s4), _systable_getnext_ordered = Module._systable_getnext_ordered = (e, t2) => (_systable_getnext_ordered = Module._systable_getnext_ordered = wasmExports.systable_getnext_ordered)(e, t2), _systable_endscan_ordered = Module._systable_endscan_ordered = (e) => (_systable_endscan_ordered = Module._systable_endscan_ordered = wasmExports.systable_endscan_ordered)(e), _init_toast_snapshot = Module._init_toast_snapshot = (e) => (_init_toast_snapshot = Module._init_toast_snapshot = wasmExports.init_toast_snapshot)(e), _convert_tuples_by_position = Module._convert_tuples_by_position = (e, t2, r) => (_convert_tuples_by_position = Module._convert_tuples_by_position = wasmExports.convert_tuples_by_position)(e, t2, r), _execute_attr_map_tuple = Module._execute_attr_map_tuple = (e, t2) => (_execute_attr_map_tuple = Module._execute_attr_map_tuple = wasmExports.execute_attr_map_tuple)(e, t2), _ExecStoreVirtualTuple = Module._ExecStoreVirtualTuple = (e) => (_ExecStoreVirtualTuple = Module._ExecStoreVirtualTuple = wasmExports.ExecStoreVirtualTuple)(e), _bms_is_member = Module._bms_is_member = (e, t2) => (_bms_is_member = Module._bms_is_member = wasmExports.bms_is_member)(e, t2), _bms_add_member = Module._bms_add_member = (e, t2) => (_bms_add_member = Module._bms_add_member = wasmExports.bms_add_member)(e, t2), _CreateTupleDescCopy = Module._CreateTupleDescCopy = (e) => (_CreateTupleDescCopy = Module._CreateTupleDescCopy = wasmExports.CreateTupleDescCopy)(e), _DecrTupleDescRefCount = Module._DecrTupleDescRefCount = (e) => (_DecrTupleDescRefCount = Module._DecrTupleDescRefCount = wasmExports.DecrTupleDescRefCount)(e), _datumIsEqual = Module._datumIsEqual = (e, t2, r, a2) => (_datumIsEqual = Module._datumIsEqual = wasmExports.datumIsEqual)(e, t2, r, a2), _TupleDescInitEntryCollation = Module._TupleDescInitEntryCollation = (e, t2, r) => (_TupleDescInitEntryCollation = Module._TupleDescInitEntryCollation = wasmExports.TupleDescInitEntryCollation)(e, t2, r), _stringToNode = Module._stringToNode = (e) => (_stringToNode = Module._stringToNode = wasmExports.stringToNode)(e), _pg_detoast_datum_copy = Module._pg_detoast_datum_copy = (e) => (_pg_detoast_datum_copy = Module._pg_detoast_datum_copy = wasmExports.pg_detoast_datum_copy)(e), _get_typlenbyvalalign = Module._get_typlenbyvalalign = (e, t2, r, a2) => (_get_typlenbyvalalign = Module._get_typlenbyvalalign = wasmExports.get_typlenbyvalalign)(e, t2, r, a2), _deconstruct_array = Module._deconstruct_array = (e, t2, r, a2, s4, o4, n3, _3) => (_deconstruct_array = Module._deconstruct_array = wasmExports.deconstruct_array)(e, t2, r, a2, s4, o4, n3, _3), _tbm_add_tuples = Module._tbm_add_tuples = (e, t2, r, a2) => (_tbm_add_tuples = Module._tbm_add_tuples = wasmExports.tbm_add_tuples)(e, t2, r, a2), _ginPostingListDecode = Module._ginPostingListDecode = (e, t2) => (_ginPostingListDecode = Module._ginPostingListDecode = wasmExports.ginPostingListDecode)(e, t2), _ItemPointerCompare = Module._ItemPointerCompare = (e, t2) => (_ItemPointerCompare = Module._ItemPointerCompare = wasmExports.ItemPointerCompare)(e, t2), _LockPage = Module._LockPage = (e, t2, r) => (_LockPage = Module._LockPage = wasmExports.LockPage)(e, t2, r), _UnlockPage = Module._UnlockPage = (e, t2, r) => (_UnlockPage = Module._UnlockPage = wasmExports.UnlockPage)(e, t2, r), _vacuum_delay_point = Module._vacuum_delay_point = () => (_vacuum_delay_point = Module._vacuum_delay_point = wasmExports.vacuum_delay_point)(), _RecordFreeIndexPage = Module._RecordFreeIndexPage = (e, t2) => (_RecordFreeIndexPage = Module._RecordFreeIndexPage = wasmExports.RecordFreeIndexPage)(e, t2), _IndexFreeSpaceMapVacuum = Module._IndexFreeSpaceMapVacuum = (e) => (_IndexFreeSpaceMapVacuum = Module._IndexFreeSpaceMapVacuum = wasmExports.IndexFreeSpaceMapVacuum)(e), _log_newpage_range = Module._log_newpage_range = (e, t2, r, a2, s4) => (_log_newpage_range = Module._log_newpage_range = wasmExports.log_newpage_range)(e, t2, r, a2, s4), _GetFreeIndexPage = Module._GetFreeIndexPage = (e) => (_GetFreeIndexPage = Module._GetFreeIndexPage = wasmExports.GetFreeIndexPage)(e), _ConditionalLockBuffer = Module._ConditionalLockBuffer = (e) => (_ConditionalLockBuffer = Module._ConditionalLockBuffer = wasmExports.ConditionalLockBuffer)(e), _LockBufferForCleanup = Module._LockBufferForCleanup = (e) => (_LockBufferForCleanup = Module._LockBufferForCleanup = wasmExports.LockBufferForCleanup)(e), _gistcheckpage = Module._gistcheckpage = (e, t2) => (_gistcheckpage = Module._gistcheckpage = wasmExports.gistcheckpage)(e, t2), _PageIndexMultiDelete = Module._PageIndexMultiDelete = (e, t2, r) => (_PageIndexMultiDelete = Module._PageIndexMultiDelete = wasmExports.PageIndexMultiDelete)(e, t2, r), _smgrnblocks = Module._smgrnblocks = (e, t2) => (_smgrnblocks = Module._smgrnblocks = wasmExports.smgrnblocks)(e, t2), _list_free_deep = Module._list_free_deep = (e) => (_list_free_deep = Module._list_free_deep = wasmExports.list_free_deep)(e), _pairingheap_remove_first = Module._pairingheap_remove_first = (e) => (_pairingheap_remove_first = Module._pairingheap_remove_first = wasmExports.pairingheap_remove_first)(e), _pairingheap_add = Module._pairingheap_add = (e, t2) => (_pairingheap_add = Module._pairingheap_add = wasmExports.pairingheap_add)(e, t2), _float_overflow_error = Module._float_overflow_error = () => (_float_overflow_error = Module._float_overflow_error = wasmExports.float_overflow_error)(), _float_underflow_error = Module._float_underflow_error = () => (_float_underflow_error = Module._float_underflow_error = wasmExports.float_underflow_error)(), _DirectFunctionCall5Coll = Module._DirectFunctionCall5Coll = (e, t2, r, a2, s4, o4, n3) => (_DirectFunctionCall5Coll = Module._DirectFunctionCall5Coll = wasmExports.DirectFunctionCall5Coll)(e, t2, r, a2, s4, o4, n3), _pairingheap_allocate = Module._pairingheap_allocate = (e, t2) => (_pairingheap_allocate = Module._pairingheap_allocate = wasmExports.pairingheap_allocate)(e, t2), _GenerationContextCreate = Module._GenerationContextCreate = (e, t2, r, a2, s4) => (_GenerationContextCreate = Module._GenerationContextCreate = wasmExports.GenerationContextCreate)(e, t2, r, a2, s4), _pgstat_progress_update_param = Module._pgstat_progress_update_param = (e, t2) => (_pgstat_progress_update_param = Module._pgstat_progress_update_param = wasmExports.pgstat_progress_update_param)(e, t2), __hash_getbuf = Module.__hash_getbuf = (e, t2, r, a2) => (__hash_getbuf = Module.__hash_getbuf = wasmExports._hash_getbuf)(e, t2, r, a2), __hash_relbuf = Module.__hash_relbuf = (e, t2) => (__hash_relbuf = Module.__hash_relbuf = wasmExports._hash_relbuf)(e, t2), __hash_get_indextuple_hashkey = Module.__hash_get_indextuple_hashkey = (e) => (__hash_get_indextuple_hashkey = Module.__hash_get_indextuple_hashkey = wasmExports._hash_get_indextuple_hashkey)(e), __hash_getbuf_with_strategy = Module.__hash_getbuf_with_strategy = (e, t2, r, a2, s4) => (__hash_getbuf_with_strategy = Module.__hash_getbuf_with_strategy = wasmExports._hash_getbuf_with_strategy)(e, t2, r, a2, s4), __hash_ovflblkno_to_bitno = Module.__hash_ovflblkno_to_bitno = (e, t2) => (__hash_ovflblkno_to_bitno = Module.__hash_ovflblkno_to_bitno = wasmExports._hash_ovflblkno_to_bitno)(e, t2), _list_member_oid = Module._list_member_oid = (e, t2) => (_list_member_oid = Module._list_member_oid = wasmExports.list_member_oid)(e, t2), _HeapTupleSatisfiesVisibility = Module._HeapTupleSatisfiesVisibility = (e, t2, r) => (_HeapTupleSatisfiesVisibility = Module._HeapTupleSatisfiesVisibility = wasmExports.HeapTupleSatisfiesVisibility)(e, t2, r), _read_stream_begin_relation = Module._read_stream_begin_relation = (e, t2, r, a2, s4, o4, n3) => (_read_stream_begin_relation = Module._read_stream_begin_relation = wasmExports.read_stream_begin_relation)(e, t2, r, a2, s4, o4, n3), _GetAccessStrategy = Module._GetAccessStrategy = (e) => (_GetAccessStrategy = Module._GetAccessStrategy = wasmExports.GetAccessStrategy)(e), _FreeAccessStrategy = Module._FreeAccessStrategy = (e) => (_FreeAccessStrategy = Module._FreeAccessStrategy = wasmExports.FreeAccessStrategy)(e), _read_stream_end = Module._read_stream_end = (e) => (_read_stream_end = Module._read_stream_end = wasmExports.read_stream_end)(e), _heap_getnext = Module._heap_getnext = (e, t2) => (_heap_getnext = Module._heap_getnext = wasmExports.heap_getnext)(e, t2), _HeapTupleSatisfiesVacuum = Module._HeapTupleSatisfiesVacuum = (e, t2, r) => (_HeapTupleSatisfiesVacuum = Module._HeapTupleSatisfiesVacuum = wasmExports.HeapTupleSatisfiesVacuum)(e, t2, r), _GetMultiXactIdMembers = Module._GetMultiXactIdMembers = (e, t2, r, a2) => (_GetMultiXactIdMembers = Module._GetMultiXactIdMembers = wasmExports.GetMultiXactIdMembers)(e, t2, r, a2), _TransactionIdPrecedes = Module._TransactionIdPrecedes = (e, t2) => (_TransactionIdPrecedes = Module._TransactionIdPrecedes = wasmExports.TransactionIdPrecedes)(e, t2), _HeapTupleGetUpdateXid = Module._HeapTupleGetUpdateXid = (e) => (_HeapTupleGetUpdateXid = Module._HeapTupleGetUpdateXid = wasmExports.HeapTupleGetUpdateXid)(e), _visibilitymap_clear = Module._visibilitymap_clear = (e, t2, r, a2) => (_visibilitymap_clear = Module._visibilitymap_clear = wasmExports.visibilitymap_clear)(e, t2, r, a2), _pgstat_count_heap_insert = Module._pgstat_count_heap_insert = (e, t2) => (_pgstat_count_heap_insert = Module._pgstat_count_heap_insert = wasmExports.pgstat_count_heap_insert)(e, t2), _ExecFetchSlotHeapTuple = Module._ExecFetchSlotHeapTuple = (e, t2, r) => (_ExecFetchSlotHeapTuple = Module._ExecFetchSlotHeapTuple = wasmExports.ExecFetchSlotHeapTuple)(e, t2, r), _PageGetHeapFreeSpace = Module._PageGetHeapFreeSpace = (e) => (_PageGetHeapFreeSpace = Module._PageGetHeapFreeSpace = wasmExports.PageGetHeapFreeSpace)(e), _visibilitymap_pin = Module._visibilitymap_pin = (e, t2, r) => (_visibilitymap_pin = Module._visibilitymap_pin = wasmExports.visibilitymap_pin)(e, t2, r), _HeapTupleSatisfiesUpdate = Module._HeapTupleSatisfiesUpdate = (e, t2, r) => (_HeapTupleSatisfiesUpdate = Module._HeapTupleSatisfiesUpdate = wasmExports.HeapTupleSatisfiesUpdate)(e, t2, r), _TransactionIdIsCurrentTransactionId = Module._TransactionIdIsCurrentTransactionId = (e) => (_TransactionIdIsCurrentTransactionId = Module._TransactionIdIsCurrentTransactionId = wasmExports.TransactionIdIsCurrentTransactionId)(e), _TransactionIdDidCommit = Module._TransactionIdDidCommit = (e) => (_TransactionIdDidCommit = Module._TransactionIdDidCommit = wasmExports.TransactionIdDidCommit)(e), _TransactionIdIsInProgress = Module._TransactionIdIsInProgress = (e) => (_TransactionIdIsInProgress = Module._TransactionIdIsInProgress = wasmExports.TransactionIdIsInProgress)(e), _bms_free = Module._bms_free = (e) => (_bms_free = Module._bms_free = wasmExports.bms_free)(e), _bms_add_members = Module._bms_add_members = (e, t2) => (_bms_add_members = Module._bms_add_members = wasmExports.bms_add_members)(e, t2), _bms_next_member = Module._bms_next_member = (e, t2) => (_bms_next_member = Module._bms_next_member = wasmExports.bms_next_member)(e, t2), _bms_overlap = Module._bms_overlap = (e, t2) => (_bms_overlap = Module._bms_overlap = wasmExports.bms_overlap)(e, t2), _MultiXactIdPrecedes = Module._MultiXactIdPrecedes = (e, t2) => (_MultiXactIdPrecedes = Module._MultiXactIdPrecedes = wasmExports.MultiXactIdPrecedes)(e, t2), _heap_tuple_needs_eventual_freeze = Module._heap_tuple_needs_eventual_freeze = (e) => (_heap_tuple_needs_eventual_freeze = Module._heap_tuple_needs_eventual_freeze = wasmExports.heap_tuple_needs_eventual_freeze)(e), _PrefetchBuffer = Module._PrefetchBuffer = (e, t2, r, a2) => (_PrefetchBuffer = Module._PrefetchBuffer = wasmExports.PrefetchBuffer)(e, t2, r, a2), _XLogRecGetBlockTagExtended = Module._XLogRecGetBlockTagExtended = (e, t2, r, a2, s4, o4) => (_XLogRecGetBlockTagExtended = Module._XLogRecGetBlockTagExtended = wasmExports.XLogRecGetBlockTagExtended)(e, t2, r, a2, s4, o4), _read_stream_next_buffer = Module._read_stream_next_buffer = (e, t2) => (_read_stream_next_buffer = Module._read_stream_next_buffer = wasmExports.read_stream_next_buffer)(e, t2), _smgrexists = Module._smgrexists = (e, t2) => (_smgrexists = Module._smgrexists = wasmExports.smgrexists)(e, t2), _table_slot_create = Module._table_slot_create = (e, t2) => (_table_slot_create = Module._table_slot_create = wasmExports.table_slot_create)(e, t2), _ExecDropSingleTupleTableSlot = Module._ExecDropSingleTupleTableSlot = (e) => (_ExecDropSingleTupleTableSlot = Module._ExecDropSingleTupleTableSlot = wasmExports.ExecDropSingleTupleTableSlot)(e), _CreateExecutorState = Module._CreateExecutorState = () => (_CreateExecutorState = Module._CreateExecutorState = wasmExports.CreateExecutorState)(), _MakePerTupleExprContext = Module._MakePerTupleExprContext = (e) => (_MakePerTupleExprContext = Module._MakePerTupleExprContext = wasmExports.MakePerTupleExprContext)(e), _GetOldestNonRemovableTransactionId = Module._GetOldestNonRemovableTransactionId = (e) => (_GetOldestNonRemovableTransactionId = Module._GetOldestNonRemovableTransactionId = wasmExports.GetOldestNonRemovableTransactionId)(e), _FreeExecutorState = Module._FreeExecutorState = (e) => (_FreeExecutorState = Module._FreeExecutorState = wasmExports.FreeExecutorState)(e), _MakeSingleTupleTableSlot = Module._MakeSingleTupleTableSlot = (e, t2) => (_MakeSingleTupleTableSlot = Module._MakeSingleTupleTableSlot = wasmExports.MakeSingleTupleTableSlot)(e, t2), _ExecStoreHeapTuple = Module._ExecStoreHeapTuple = (e, t2, r) => (_ExecStoreHeapTuple = Module._ExecStoreHeapTuple = wasmExports.ExecStoreHeapTuple)(e, t2, r), _visibilitymap_get_status = Module._visibilitymap_get_status = (e, t2, r) => (_visibilitymap_get_status = Module._visibilitymap_get_status = wasmExports.visibilitymap_get_status)(e, t2, r), _ExecStoreAllNullTuple = Module._ExecStoreAllNullTuple = (e) => (_ExecStoreAllNullTuple = Module._ExecStoreAllNullTuple = wasmExports.ExecStoreAllNullTuple)(e), _XidInMVCCSnapshot = Module._XidInMVCCSnapshot = (e, t2) => (_XidInMVCCSnapshot = Module._XidInMVCCSnapshot = wasmExports.XidInMVCCSnapshot)(e, t2), _hash_seq_init = Module._hash_seq_init = (e, t2) => (_hash_seq_init = Module._hash_seq_init = wasmExports.hash_seq_init)(e, t2), _hash_seq_search = Module._hash_seq_search = (e) => (_hash_seq_search = Module._hash_seq_search = wasmExports.hash_seq_search)(e), _ftruncate = Module._ftruncate = (e, t2) => (_ftruncate = Module._ftruncate = wasmExports.ftruncate)(e, t2), _fd_fsync_fname = Module._fd_fsync_fname = (e, t2) => (_fd_fsync_fname = Module._fd_fsync_fname = wasmExports.fd_fsync_fname)(e, t2), _get_namespace_name = Module._get_namespace_name = (e) => (_get_namespace_name = Module._get_namespace_name = wasmExports.get_namespace_name)(e), _GetRecordedFreeSpace = Module._GetRecordedFreeSpace = (e, t2) => (_GetRecordedFreeSpace = Module._GetRecordedFreeSpace = wasmExports.GetRecordedFreeSpace)(e, t2), _vac_estimate_reltuples = Module._vac_estimate_reltuples = (e, t2, r, a2) => (_vac_estimate_reltuples = Module._vac_estimate_reltuples = wasmExports.vac_estimate_reltuples)(e, t2, r, a2), _WaitLatch = Module._WaitLatch = (e, t2, r, a2) => (_WaitLatch = Module._WaitLatch = wasmExports.WaitLatch)(e, t2, r, a2), _ResetLatch = Module._ResetLatch = (e) => (_ResetLatch = Module._ResetLatch = wasmExports.ResetLatch)(e), _clock_gettime = Module._clock_gettime = (e, t2) => (_clock_gettime = Module._clock_gettime = wasmExports.clock_gettime)(e, t2), _WalUsageAccumDiff = Module._WalUsageAccumDiff = (e, t2, r) => (_WalUsageAccumDiff = Module._WalUsageAccumDiff = wasmExports.WalUsageAccumDiff)(e, t2, r), _BufferUsageAccumDiff = Module._BufferUsageAccumDiff = (e, t2, r) => (_BufferUsageAccumDiff = Module._BufferUsageAccumDiff = wasmExports.BufferUsageAccumDiff)(e, t2, r), _visibilitymap_prepare_truncate = Module._visibilitymap_prepare_truncate = (e, t2) => (_visibilitymap_prepare_truncate = Module._visibilitymap_prepare_truncate = wasmExports.visibilitymap_prepare_truncate)(e, t2), _pg_class_aclcheck = Module._pg_class_aclcheck = (e, t2, r) => (_pg_class_aclcheck = Module._pg_class_aclcheck = wasmExports.pg_class_aclcheck)(e, t2, r), _btboolcmp = Module._btboolcmp = (e) => (_btboolcmp = Module._btboolcmp = wasmExports.btboolcmp)(e), _btint2cmp = Module._btint2cmp = (e) => (_btint2cmp = Module._btint2cmp = wasmExports.btint2cmp)(e), _btint4cmp = Module._btint4cmp = (e) => (_btint4cmp = Module._btint4cmp = wasmExports.btint4cmp)(e), _btint8cmp = Module._btint8cmp = (e) => (_btint8cmp = Module._btint8cmp = wasmExports.btint8cmp)(e), _btoidcmp = Module._btoidcmp = (e) => (_btoidcmp = Module._btoidcmp = wasmExports.btoidcmp)(e), _btcharcmp = Module._btcharcmp = (e) => (_btcharcmp = Module._btcharcmp = wasmExports.btcharcmp)(e), __bt_form_posting = Module.__bt_form_posting = (e, t2, r) => (__bt_form_posting = Module.__bt_form_posting = wasmExports._bt_form_posting)(e, t2, r), __bt_mkscankey = Module.__bt_mkscankey = (e, t2) => (__bt_mkscankey = Module.__bt_mkscankey = wasmExports._bt_mkscankey)(e, t2), __bt_checkpage = Module.__bt_checkpage = (e, t2) => (__bt_checkpage = Module.__bt_checkpage = wasmExports._bt_checkpage)(e, t2), __bt_compare = Module.__bt_compare = (e, t2, r, a2) => (__bt_compare = Module.__bt_compare = wasmExports._bt_compare)(e, t2, r, a2), __bt_relbuf = Module.__bt_relbuf = (e, t2) => (__bt_relbuf = Module.__bt_relbuf = wasmExports._bt_relbuf)(e, t2), __bt_search = Module.__bt_search = (e, t2, r, a2, s4) => (__bt_search = Module.__bt_search = wasmExports._bt_search)(e, t2, r, a2, s4), __bt_binsrch_insert = Module.__bt_binsrch_insert = (e, t2) => (__bt_binsrch_insert = Module.__bt_binsrch_insert = wasmExports._bt_binsrch_insert)(e, t2), __bt_freestack = Module.__bt_freestack = (e) => (__bt_freestack = Module.__bt_freestack = wasmExports._bt_freestack)(e), __bt_metaversion = Module.__bt_metaversion = (e, t2, r) => (__bt_metaversion = Module.__bt_metaversion = wasmExports._bt_metaversion)(e, t2, r), __bt_allequalimage = Module.__bt_allequalimage = (e, t2) => (__bt_allequalimage = Module.__bt_allequalimage = wasmExports._bt_allequalimage)(e, t2), _before_shmem_exit = Module._before_shmem_exit = (e, t2) => (_before_shmem_exit = Module._before_shmem_exit = wasmExports.before_shmem_exit)(e, t2), _cancel_before_shmem_exit = Module._cancel_before_shmem_exit = (e, t2) => (_cancel_before_shmem_exit = Module._cancel_before_shmem_exit = wasmExports.cancel_before_shmem_exit)(e, t2), _pg_re_throw = Module._pg_re_throw = () => (_pg_re_throw = Module._pg_re_throw = wasmExports.pg_re_throw)(), _get_opfamily_member = Module._get_opfamily_member = (e, t2, r, a2) => (_get_opfamily_member = Module._get_opfamily_member = wasmExports.get_opfamily_member)(e, t2, r, a2), __bt_check_natts = Module.__bt_check_natts = (e, t2, r, a2) => (__bt_check_natts = Module.__bt_check_natts = wasmExports._bt_check_natts)(e, t2, r, a2), _timestamptz_to_str = Module._timestamptz_to_str = (e) => (_timestamptz_to_str = Module._timestamptz_to_str = wasmExports.timestamptz_to_str)(e), _XLogRecGetBlockRefInfo = Module._XLogRecGetBlockRefInfo = (e, t2, r, a2, s4) => (_XLogRecGetBlockRefInfo = Module._XLogRecGetBlockRefInfo = wasmExports.XLogRecGetBlockRefInfo)(e, t2, r, a2, s4), _varstr_cmp = Module._varstr_cmp = (e, t2, r, a2, s4) => (_varstr_cmp = Module._varstr_cmp = wasmExports.varstr_cmp)(e, t2, r, a2, s4), _exprType = Module._exprType = (e) => (_exprType = Module._exprType = wasmExports.exprType)(e), _GetActiveSnapshot = Module._GetActiveSnapshot = () => (_GetActiveSnapshot = Module._GetActiveSnapshot = wasmExports.GetActiveSnapshot)(), _errdetail_relkind_not_supported = Module._errdetail_relkind_not_supported = (e) => (_errdetail_relkind_not_supported = Module._errdetail_relkind_not_supported = wasmExports.errdetail_relkind_not_supported)(e), _table_openrv = Module._table_openrv = (e, t2) => (_table_openrv = Module._table_openrv = wasmExports.table_openrv)(e, t2), _table_slot_callbacks = Module._table_slot_callbacks = (e) => (_table_slot_callbacks = Module._table_slot_callbacks = wasmExports.table_slot_callbacks)(e), _clamp_row_est = Module._clamp_row_est = (e) => (_clamp_row_est = Module._clamp_row_est = wasmExports.clamp_row_est)(e), _estimate_expression_value = Module._estimate_expression_value = (e, t2) => (_estimate_expression_value = Module._estimate_expression_value = wasmExports.estimate_expression_value)(e, t2), _XLogFlush = Module._XLogFlush = (e) => (_XLogFlush = Module._XLogFlush = wasmExports.XLogFlush)(e), _get_call_result_type = Module._get_call_result_type = (e, t2, r) => (_get_call_result_type = Module._get_call_result_type = wasmExports.get_call_result_type)(e, t2, r), _HeapTupleHeaderGetDatum = Module._HeapTupleHeaderGetDatum = (e) => (_HeapTupleHeaderGetDatum = Module._HeapTupleHeaderGetDatum = wasmExports.HeapTupleHeaderGetDatum)(e), _GenericXLogStart = Module._GenericXLogStart = (e) => (_GenericXLogStart = Module._GenericXLogStart = wasmExports.GenericXLogStart)(e), _GenericXLogRegisterBuffer = Module._GenericXLogRegisterBuffer = (e, t2, r) => (_GenericXLogRegisterBuffer = Module._GenericXLogRegisterBuffer = wasmExports.GenericXLogRegisterBuffer)(e, t2, r), _GenericXLogFinish = Module._GenericXLogFinish = (e) => (_GenericXLogFinish = Module._GenericXLogFinish = wasmExports.GenericXLogFinish)(e), _GenericXLogAbort = Module._GenericXLogAbort = (e) => (_GenericXLogAbort = Module._GenericXLogAbort = wasmExports.GenericXLogAbort)(e), _errmsg_plural = Module._errmsg_plural = (e, t2, r, a2) => (_errmsg_plural = Module._errmsg_plural = wasmExports.errmsg_plural)(e, t2, r, a2), _ReadNextMultiXactId = Module._ReadNextMultiXactId = () => (_ReadNextMultiXactId = Module._ReadNextMultiXactId = wasmExports.ReadNextMultiXactId)(), _ReadMultiXactIdRange = Module._ReadMultiXactIdRange = (e, t2) => (_ReadMultiXactIdRange = Module._ReadMultiXactIdRange = wasmExports.ReadMultiXactIdRange)(e, t2), _MultiXactIdPrecedesOrEquals = Module._MultiXactIdPrecedesOrEquals = (e, t2) => (_MultiXactIdPrecedesOrEquals = Module._MultiXactIdPrecedesOrEquals = wasmExports.MultiXactIdPrecedesOrEquals)(e, t2), _init_MultiFuncCall = Module._init_MultiFuncCall = (e) => (_init_MultiFuncCall = Module._init_MultiFuncCall = wasmExports.init_MultiFuncCall)(e), _TupleDescGetAttInMetadata = Module._TupleDescGetAttInMetadata = (e) => (_TupleDescGetAttInMetadata = Module._TupleDescGetAttInMetadata = wasmExports.TupleDescGetAttInMetadata)(e), _per_MultiFuncCall = Module._per_MultiFuncCall = (e) => (_per_MultiFuncCall = Module._per_MultiFuncCall = wasmExports.per_MultiFuncCall)(e), _BuildTupleFromCStrings = Module._BuildTupleFromCStrings = (e, t2) => (_BuildTupleFromCStrings = Module._BuildTupleFromCStrings = wasmExports.BuildTupleFromCStrings)(e, t2), _end_MultiFuncCall = Module._end_MultiFuncCall = (e, t2) => (_end_MultiFuncCall = Module._end_MultiFuncCall = wasmExports.end_MultiFuncCall)(e, t2), _GetCurrentSubTransactionId = Module._GetCurrentSubTransactionId = () => (_GetCurrentSubTransactionId = Module._GetCurrentSubTransactionId = wasmExports.GetCurrentSubTransactionId)(), _WaitForBackgroundWorkerShutdown = Module._WaitForBackgroundWorkerShutdown = (e) => (_WaitForBackgroundWorkerShutdown = Module._WaitForBackgroundWorkerShutdown = wasmExports.WaitForBackgroundWorkerShutdown)(e), _RegisterDynamicBackgroundWorker = Module._RegisterDynamicBackgroundWorker = (e, t2) => (_RegisterDynamicBackgroundWorker = Module._RegisterDynamicBackgroundWorker = wasmExports.RegisterDynamicBackgroundWorker)(e, t2), _BackgroundWorkerUnblockSignals = Module._BackgroundWorkerUnblockSignals = () => (_BackgroundWorkerUnblockSignals = Module._BackgroundWorkerUnblockSignals = wasmExports.BackgroundWorkerUnblockSignals)(), _BackgroundWorkerInitializeConnectionByOid = Module._BackgroundWorkerInitializeConnectionByOid = (e, t2, r) => (_BackgroundWorkerInitializeConnectionByOid = Module._BackgroundWorkerInitializeConnectionByOid = wasmExports.BackgroundWorkerInitializeConnectionByOid)(e, t2, r), _GetDatabaseEncoding = Module._GetDatabaseEncoding = () => (_GetDatabaseEncoding = Module._GetDatabaseEncoding = wasmExports.GetDatabaseEncoding)(), _RmgrNotFound = Module._RmgrNotFound = (e) => (_RmgrNotFound = Module._RmgrNotFound = wasmExports.RmgrNotFound)(e), _InitMaterializedSRF = Module._InitMaterializedSRF = (e, t2) => (_InitMaterializedSRF = Module._InitMaterializedSRF = wasmExports.InitMaterializedSRF)(e, t2), _tuplestore_putvalues = Module._tuplestore_putvalues = (e, t2, r, a2) => (_tuplestore_putvalues = Module._tuplestore_putvalues = wasmExports.tuplestore_putvalues)(e, t2, r, a2), _AllocateFile = Module._AllocateFile = (e, t2) => (_AllocateFile = Module._AllocateFile = wasmExports.AllocateFile)(e, t2), _FreeFile = Module._FreeFile = (e) => (_FreeFile = Module._FreeFile = wasmExports.FreeFile)(e), _fd_durable_rename = Module._fd_durable_rename = (e, t2, r) => (_fd_durable_rename = Module._fd_durable_rename = wasmExports.fd_durable_rename)(e, t2, r), _BlessTupleDesc = Module._BlessTupleDesc = (e) => (_BlessTupleDesc = Module._BlessTupleDesc = wasmExports.BlessTupleDesc)(e), _fstat = Module._fstat = (e, t2) => (_fstat = Module._fstat = wasmExports.fstat)(e, t2), _superuser_arg = Module._superuser_arg = (e) => (_superuser_arg = Module._superuser_arg = wasmExports.superuser_arg)(e), _wal_segment_close = Module._wal_segment_close = (e) => (_wal_segment_close = Module._wal_segment_close = wasmExports.wal_segment_close)(e), _wal_segment_open = Module._wal_segment_open = (e, t2, r) => (_wal_segment_open = Module._wal_segment_open = wasmExports.wal_segment_open)(e, t2, r), _XLogReaderAllocate = Module._XLogReaderAllocate = (e, t2, r, a2) => (_XLogReaderAllocate = Module._XLogReaderAllocate = wasmExports.XLogReaderAllocate)(e, t2, r, a2), _XLogReadRecord = Module._XLogReadRecord = (e, t2) => (_XLogReadRecord = Module._XLogReadRecord = wasmExports.XLogReadRecord)(e, t2), _XLogReaderFree = Module._XLogReaderFree = (e) => (_XLogReaderFree = Module._XLogReaderFree = wasmExports.XLogReaderFree)(e), _GetTopFullTransactionId = Module._GetTopFullTransactionId = () => (_GetTopFullTransactionId = Module._GetTopFullTransactionId = wasmExports.GetTopFullTransactionId)(), _GetCurrentTransactionNestLevel = Module._GetCurrentTransactionNestLevel = () => (_GetCurrentTransactionNestLevel = Module._GetCurrentTransactionNestLevel = wasmExports.GetCurrentTransactionNestLevel)(), _ResourceOwnerCreate = Module._ResourceOwnerCreate = (e, t2) => (_ResourceOwnerCreate = Module._ResourceOwnerCreate = wasmExports.ResourceOwnerCreate)(e, t2), _RegisterXactCallback = Module._RegisterXactCallback = (e, t2) => (_RegisterXactCallback = Module._RegisterXactCallback = wasmExports.RegisterXactCallback)(e, t2), _RegisterSubXactCallback = Module._RegisterSubXactCallback = (e, t2) => (_RegisterSubXactCallback = Module._RegisterSubXactCallback = wasmExports.RegisterSubXactCallback)(e, t2), _BeginInternalSubTransaction = Module._BeginInternalSubTransaction = (e) => (_BeginInternalSubTransaction = Module._BeginInternalSubTransaction = wasmExports.BeginInternalSubTransaction)(e), _ReleaseCurrentSubTransaction = Module._ReleaseCurrentSubTransaction = () => (_ReleaseCurrentSubTransaction = Module._ReleaseCurrentSubTransaction = wasmExports.ReleaseCurrentSubTransaction)(), _ResourceOwnerDelete = Module._ResourceOwnerDelete = (e) => (_ResourceOwnerDelete = Module._ResourceOwnerDelete = wasmExports.ResourceOwnerDelete)(e), _RollbackAndReleaseCurrentSubTransaction = Module._RollbackAndReleaseCurrentSubTransaction = () => (_RollbackAndReleaseCurrentSubTransaction = Module._RollbackAndReleaseCurrentSubTransaction = wasmExports.RollbackAndReleaseCurrentSubTransaction)(), _ReleaseExternalFD = Module._ReleaseExternalFD = () => (_ReleaseExternalFD = Module._ReleaseExternalFD = wasmExports.ReleaseExternalFD)(), _GetFlushRecPtr = Module._GetFlushRecPtr = (e) => (_GetFlushRecPtr = Module._GetFlushRecPtr = wasmExports.GetFlushRecPtr)(e), _GetXLogReplayRecPtr = Module._GetXLogReplayRecPtr = (e) => (_GetXLogReplayRecPtr = Module._GetXLogReplayRecPtr = wasmExports.GetXLogReplayRecPtr)(e), _TimestampDifferenceMilliseconds = Module._TimestampDifferenceMilliseconds = (e, t2) => (_TimestampDifferenceMilliseconds = Module._TimestampDifferenceMilliseconds = wasmExports.TimestampDifferenceMilliseconds)(e, t2), _numeric_in = Module._numeric_in = (e) => (_numeric_in = Module._numeric_in = wasmExports.numeric_in)(e), _DirectFunctionCall3Coll = Module._DirectFunctionCall3Coll = (e, t2, r, a2, s4) => (_DirectFunctionCall3Coll = Module._DirectFunctionCall3Coll = wasmExports.DirectFunctionCall3Coll)(e, t2, r, a2, s4), _XLogFindNextRecord = Module._XLogFindNextRecord = (e, t2) => (_XLogFindNextRecord = Module._XLogFindNextRecord = wasmExports.XLogFindNextRecord)(e, t2), _RestoreBlockImage = Module._RestoreBlockImage = (e, t2, r) => (_RestoreBlockImage = Module._RestoreBlockImage = wasmExports.RestoreBlockImage)(e, t2, r), _timestamptz_in = Module._timestamptz_in = (e) => (_timestamptz_in = Module._timestamptz_in = wasmExports.timestamptz_in)(e), _fscanf = Module._fscanf = (e, t2, r) => (_fscanf = Module._fscanf = wasmExports.fscanf)(e, t2, r), _XLogRecStoreStats = Module._XLogRecStoreStats = (e, t2) => (_XLogRecStoreStats = Module._XLogRecStoreStats = wasmExports.XLogRecStoreStats)(e, t2), _hash_get_num_entries = Module._hash_get_num_entries = (e) => (_hash_get_num_entries = Module._hash_get_num_entries = wasmExports.hash_get_num_entries)(e), _read_local_xlog_page_no_wait = Module._read_local_xlog_page_no_wait = (e, t2, r, a2, s4) => (_read_local_xlog_page_no_wait = Module._read_local_xlog_page_no_wait = wasmExports.read_local_xlog_page_no_wait)(e, t2, r, a2, s4), _escape_json = Module._escape_json = (e, t2) => (_escape_json = Module._escape_json = wasmExports.escape_json)(e, t2), _list_sort = Module._list_sort = (e, t2) => (_list_sort = Module._list_sort = wasmExports.list_sort)(e, t2), _pg_checksum_page = Module._pg_checksum_page = (e, t2) => (_pg_checksum_page = Module._pg_checksum_page = wasmExports.pg_checksum_page)(e, t2), _bbsink_forward_end_archive = Module._bbsink_forward_end_archive = (e) => (_bbsink_forward_end_archive = Module._bbsink_forward_end_archive = wasmExports.bbsink_forward_end_archive)(e), _bbsink_forward_begin_manifest = Module._bbsink_forward_begin_manifest = (e) => (_bbsink_forward_begin_manifest = Module._bbsink_forward_begin_manifest = wasmExports.bbsink_forward_begin_manifest)(e), _bbsink_forward_end_manifest = Module._bbsink_forward_end_manifest = (e) => (_bbsink_forward_end_manifest = Module._bbsink_forward_end_manifest = wasmExports.bbsink_forward_end_manifest)(e), _bbsink_forward_end_backup = Module._bbsink_forward_end_backup = (e, t2, r) => (_bbsink_forward_end_backup = Module._bbsink_forward_end_backup = wasmExports.bbsink_forward_end_backup)(e, t2, r), _bbsink_forward_cleanup = Module._bbsink_forward_cleanup = (e) => (_bbsink_forward_cleanup = Module._bbsink_forward_cleanup = wasmExports.bbsink_forward_cleanup)(e), _list_concat = Module._list_concat = (e, t2) => (_list_concat = Module._list_concat = wasmExports.list_concat)(e, t2), _bbsink_forward_begin_backup = Module._bbsink_forward_begin_backup = (e) => (_bbsink_forward_begin_backup = Module._bbsink_forward_begin_backup = wasmExports.bbsink_forward_begin_backup)(e), _bbsink_forward_archive_contents = Module._bbsink_forward_archive_contents = (e, t2) => (_bbsink_forward_archive_contents = Module._bbsink_forward_archive_contents = wasmExports.bbsink_forward_archive_contents)(e, t2), _bbsink_forward_begin_archive = Module._bbsink_forward_begin_archive = (e, t2) => (_bbsink_forward_begin_archive = Module._bbsink_forward_begin_archive = wasmExports.bbsink_forward_begin_archive)(e, t2), _bbsink_forward_manifest_contents = Module._bbsink_forward_manifest_contents = (e, t2) => (_bbsink_forward_manifest_contents = Module._bbsink_forward_manifest_contents = wasmExports.bbsink_forward_manifest_contents)(e, t2), _has_privs_of_role = Module._has_privs_of_role = (e, t2) => (_has_privs_of_role = Module._has_privs_of_role = wasmExports.has_privs_of_role)(e, t2), _BaseBackupAddTarget = Module._BaseBackupAddTarget = (e, t2, r) => (_BaseBackupAddTarget = Module._BaseBackupAddTarget = wasmExports.BaseBackupAddTarget)(e, t2, r), _list_copy = Module._list_copy = (e) => (_list_copy = Module._list_copy = wasmExports.list_copy)(e), _tuplestore_puttuple = Module._tuplestore_puttuple = (e, t2) => (_tuplestore_puttuple = Module._tuplestore_puttuple = wasmExports.tuplestore_puttuple)(e, t2), _makeRangeVar = Module._makeRangeVar = (e, t2, r) => (_makeRangeVar = Module._makeRangeVar = wasmExports.makeRangeVar)(e, t2, r), _DefineIndex = Module._DefineIndex = (e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2) => (_DefineIndex = Module._DefineIndex = wasmExports.DefineIndex)(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2), _fread = Module._fread = (e, t2, r, a2) => (_fread = Module._fread = wasmExports.fread)(e, t2, r, a2), _clearerr = Module._clearerr = (e) => (_clearerr = Module._clearerr = wasmExports.clearerr)(e), _copyObjectImpl = Module._copyObjectImpl = (e) => (_copyObjectImpl = Module._copyObjectImpl = wasmExports.copyObjectImpl)(e), _lappend_oid = Module._lappend_oid = (e, t2) => (_lappend_oid = Module._lappend_oid = wasmExports.lappend_oid)(e, t2), _makeTypeNameFromNameList = Module._makeTypeNameFromNameList = (e) => (_makeTypeNameFromNameList = Module._makeTypeNameFromNameList = wasmExports.makeTypeNameFromNameList)(e), _CatalogTupleUpdate = Module._CatalogTupleUpdate = (e, t2, r) => (_CatalogTupleUpdate = Module._CatalogTupleUpdate = wasmExports.CatalogTupleUpdate)(e, t2, r), _get_rel_name = Module._get_rel_name = (e) => (_get_rel_name = Module._get_rel_name = wasmExports.get_rel_name)(e), _CatalogTupleDelete = Module._CatalogTupleDelete = (e, t2) => (_CatalogTupleDelete = Module._CatalogTupleDelete = wasmExports.CatalogTupleDelete)(e, t2), _CatalogTupleInsert = Module._CatalogTupleInsert = (e, t2) => (_CatalogTupleInsert = Module._CatalogTupleInsert = wasmExports.CatalogTupleInsert)(e, t2), _recordDependencyOn = Module._recordDependencyOn = (e, t2, r) => (_recordDependencyOn = Module._recordDependencyOn = wasmExports.recordDependencyOn)(e, t2, r), _get_element_type = Module._get_element_type = (e) => (_get_element_type = Module._get_element_type = wasmExports.get_element_type)(e), _object_aclcheck = Module._object_aclcheck = (e, t2, r, a2) => (_object_aclcheck = Module._object_aclcheck = wasmExports.object_aclcheck)(e, t2, r, a2), _superuser = Module._superuser = () => (_superuser = Module._superuser = wasmExports.superuser)(), _SearchSysCacheAttName = Module._SearchSysCacheAttName = (e, t2) => (_SearchSysCacheAttName = Module._SearchSysCacheAttName = wasmExports.SearchSysCacheAttName)(e, t2), _new_object_addresses = Module._new_object_addresses = () => (_new_object_addresses = Module._new_object_addresses = wasmExports.new_object_addresses)(), _free_object_addresses = Module._free_object_addresses = (e) => (_free_object_addresses = Module._free_object_addresses = wasmExports.free_object_addresses)(e), _performMultipleDeletions = Module._performMultipleDeletions = (e, t2, r) => (_performMultipleDeletions = Module._performMultipleDeletions = wasmExports.performMultipleDeletions)(e, t2, r), _recordDependencyOnExpr = Module._recordDependencyOnExpr = (e, t2, r, a2) => (_recordDependencyOnExpr = Module._recordDependencyOnExpr = wasmExports.recordDependencyOnExpr)(e, t2, r, a2), _query_tree_walker_impl = Module._query_tree_walker_impl = (e, t2, r, a2) => (_query_tree_walker_impl = Module._query_tree_walker_impl = wasmExports.query_tree_walker_impl)(e, t2, r, a2), _expression_tree_walker_impl = Module._expression_tree_walker_impl = (e, t2, r) => (_expression_tree_walker_impl = Module._expression_tree_walker_impl = wasmExports.expression_tree_walker_impl)(e, t2, r), _add_exact_object_address = Module._add_exact_object_address = (e, t2) => (_add_exact_object_address = Module._add_exact_object_address = wasmExports.add_exact_object_address)(e, t2), _get_rel_relkind = Module._get_rel_relkind = (e) => (_get_rel_relkind = Module._get_rel_relkind = wasmExports.get_rel_relkind)(e), _get_typtype = Module._get_typtype = (e) => (_get_typtype = Module._get_typtype = wasmExports.get_typtype)(e), _list_delete_last = Module._list_delete_last = (e) => (_list_delete_last = Module._list_delete_last = wasmExports.list_delete_last)(e), _type_is_collatable = Module._type_is_collatable = (e) => (_type_is_collatable = Module._type_is_collatable = wasmExports.type_is_collatable)(e), _GetSysCacheOid = Module._GetSysCacheOid = (e, t2, r, a2, s4, o4) => (_GetSysCacheOid = Module._GetSysCacheOid = wasmExports.GetSysCacheOid)(e, t2, r, a2, s4, o4), _CheckTableNotInUse = Module._CheckTableNotInUse = (e, t2) => (_CheckTableNotInUse = Module._CheckTableNotInUse = wasmExports.CheckTableNotInUse)(e, t2), _construct_array = Module._construct_array = (e, t2, r, a2, s4, o4) => (_construct_array = Module._construct_array = wasmExports.construct_array)(e, t2, r, a2, s4, o4), _make_parsestate = Module._make_parsestate = (e) => (_make_parsestate = Module._make_parsestate = wasmExports.make_parsestate)(e), _transformExpr = Module._transformExpr = (e, t2, r) => (_transformExpr = Module._transformExpr = wasmExports.transformExpr)(e, t2, r), _equal = Module._equal = (e, t2) => (_equal = Module._equal = wasmExports.equal)(e, t2), _pull_var_clause = Module._pull_var_clause = (e, t2) => (_pull_var_clause = Module._pull_var_clause = wasmExports.pull_var_clause)(e, t2), _get_attname = Module._get_attname = (e, t2, r) => (_get_attname = Module._get_attname = wasmExports.get_attname)(e, t2, r), _coerce_to_target_type = Module._coerce_to_target_type = (e, t2, r, a2, s4, o4, n3, _3) => (_coerce_to_target_type = Module._coerce_to_target_type = wasmExports.coerce_to_target_type)(e, t2, r, a2, s4, o4, n3, _3), _nodeToString = Module._nodeToString = (e) => (_nodeToString = Module._nodeToString = wasmExports.nodeToString)(e), _parser_errposition = Module._parser_errposition = (e, t2) => (_parser_errposition = Module._parser_errposition = wasmExports.parser_errposition)(e, t2), _exprTypmod = Module._exprTypmod = (e) => (_exprTypmod = Module._exprTypmod = wasmExports.exprTypmod)(e), _get_base_element_type = Module._get_base_element_type = (e) => (_get_base_element_type = Module._get_base_element_type = wasmExports.get_base_element_type)(e), _SystemFuncName = Module._SystemFuncName = (e) => (_SystemFuncName = Module._SystemFuncName = wasmExports.SystemFuncName)(e), _CreateTrigger = Module._CreateTrigger = (e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2) => (_CreateTrigger = Module._CreateTrigger = wasmExports.CreateTrigger)(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2), _plan_create_index_workers = Module._plan_create_index_workers = (e, t2) => (_plan_create_index_workers = Module._plan_create_index_workers = wasmExports.plan_create_index_workers)(e, t2), _get_rel_namespace = Module._get_rel_namespace = (e) => (_get_rel_namespace = Module._get_rel_namespace = wasmExports.get_rel_namespace)(e), _ConditionalLockRelationOid = Module._ConditionalLockRelationOid = (e, t2) => (_ConditionalLockRelationOid = Module._ConditionalLockRelationOid = wasmExports.ConditionalLockRelationOid)(e, t2), _RelnameGetRelid = Module._RelnameGetRelid = (e) => (_RelnameGetRelid = Module._RelnameGetRelid = wasmExports.RelnameGetRelid)(e), _get_relkind_objtype = Module._get_relkind_objtype = (e) => (_get_relkind_objtype = Module._get_relkind_objtype = wasmExports.get_relkind_objtype)(e), _RelationIsVisible = Module._RelationIsVisible = (e) => (_RelationIsVisible = Module._RelationIsVisible = wasmExports.RelationIsVisible)(e), _get_func_arg_info = Module._get_func_arg_info = (e, t2, r, a2) => (_get_func_arg_info = Module._get_func_arg_info = wasmExports.get_func_arg_info)(e, t2, r, a2), _NameListToString = Module._NameListToString = (e) => (_NameListToString = Module._NameListToString = wasmExports.NameListToString)(e), _OpernameGetOprid = Module._OpernameGetOprid = (e, t2, r) => (_OpernameGetOprid = Module._OpernameGetOprid = wasmExports.OpernameGetOprid)(e, t2, r), _makeRangeVarFromNameList = Module._makeRangeVarFromNameList = (e) => (_makeRangeVarFromNameList = Module._makeRangeVarFromNameList = wasmExports.makeRangeVarFromNameList)(e), _quote_identifier = Module._quote_identifier = (e) => (_quote_identifier = Module._quote_identifier = wasmExports.quote_identifier)(e), _GetSearchPathMatcher = Module._GetSearchPathMatcher = (e) => (_GetSearchPathMatcher = Module._GetSearchPathMatcher = wasmExports.GetSearchPathMatcher)(e), _SearchPathMatchesCurrentEnvironment = Module._SearchPathMatchesCurrentEnvironment = (e) => (_SearchPathMatchesCurrentEnvironment = Module._SearchPathMatchesCurrentEnvironment = wasmExports.SearchPathMatchesCurrentEnvironment)(e), _get_collation_oid = Module._get_collation_oid = (e, t2) => (_get_collation_oid = Module._get_collation_oid = wasmExports.get_collation_oid)(e, t2), _CacheRegisterSyscacheCallback = Module._CacheRegisterSyscacheCallback = (e, t2, r) => (_CacheRegisterSyscacheCallback = Module._CacheRegisterSyscacheCallback = wasmExports.CacheRegisterSyscacheCallback)(e, t2, r), _get_extension_oid = Module._get_extension_oid = (e, t2) => (_get_extension_oid = Module._get_extension_oid = wasmExports.get_extension_oid)(e, t2), _get_role_oid = Module._get_role_oid = (e, t2) => (_get_role_oid = Module._get_role_oid = wasmExports.get_role_oid)(e, t2), _GetForeignServerByName = Module._GetForeignServerByName = (e, t2) => (_GetForeignServerByName = Module._GetForeignServerByName = wasmExports.GetForeignServerByName)(e, t2), _typeStringToTypeName = Module._typeStringToTypeName = (e, t2) => (_typeStringToTypeName = Module._typeStringToTypeName = wasmExports.typeStringToTypeName)(e, t2), _list_make2_impl = Module._list_make2_impl = (e, t2, r) => (_list_make2_impl = Module._list_make2_impl = wasmExports.list_make2_impl)(e, t2, r), _GetUserNameFromId = Module._GetUserNameFromId = (e, t2) => (_GetUserNameFromId = Module._GetUserNameFromId = wasmExports.GetUserNameFromId)(e, t2), _format_type_extended = Module._format_type_extended = (e, t2, r) => (_format_type_extended = Module._format_type_extended = wasmExports.format_type_extended)(e, t2, r), _quote_qualified_identifier = Module._quote_qualified_identifier = (e, t2) => (_quote_qualified_identifier = Module._quote_qualified_identifier = wasmExports.quote_qualified_identifier)(e, t2), _get_tablespace_name = Module._get_tablespace_name = (e) => (_get_tablespace_name = Module._get_tablespace_name = wasmExports.get_tablespace_name)(e), _GetForeignServerExtended = Module._GetForeignServerExtended = (e, t2) => (_GetForeignServerExtended = Module._GetForeignServerExtended = wasmExports.GetForeignServerExtended)(e, t2), _GetForeignServer = Module._GetForeignServer = (e) => (_GetForeignServer = Module._GetForeignServer = wasmExports.GetForeignServer)(e), _construct_empty_array = Module._construct_empty_array = (e) => (_construct_empty_array = Module._construct_empty_array = wasmExports.construct_empty_array)(e), _format_type_be_qualified = Module._format_type_be_qualified = (e) => (_format_type_be_qualified = Module._format_type_be_qualified = wasmExports.format_type_be_qualified)(e), _get_namespace_name_or_temp = Module._get_namespace_name_or_temp = (e) => (_get_namespace_name_or_temp = Module._get_namespace_name_or_temp = wasmExports.get_namespace_name_or_temp)(e), _list_make3_impl = Module._list_make3_impl = (e, t2, r, a2) => (_list_make3_impl = Module._list_make3_impl = wasmExports.list_make3_impl)(e, t2, r, a2), _construct_md_array = Module._construct_md_array = (e, t2, r, a2, s4, o4, n3, _3, l3) => (_construct_md_array = Module._construct_md_array = wasmExports.construct_md_array)(e, t2, r, a2, s4, o4, n3, _3, l3), _pull_varattnos = Module._pull_varattnos = (e, t2, r) => (_pull_varattnos = Module._pull_varattnos = wasmExports.pull_varattnos)(e, t2, r), _get_func_name = Module._get_func_name = (e) => (_get_func_name = Module._get_func_name = wasmExports.get_func_name)(e), _construct_array_builtin = Module._construct_array_builtin = (e, t2, r) => (_construct_array_builtin = Module._construct_array_builtin = wasmExports.construct_array_builtin)(e, t2, r), _makeObjectName = Module._makeObjectName = (e, t2, r) => (_makeObjectName = Module._makeObjectName = wasmExports.makeObjectName)(e, t2, r), _get_primary_key_attnos = Module._get_primary_key_attnos = (e, t2, r) => (_get_primary_key_attnos = Module._get_primary_key_attnos = wasmExports.get_primary_key_attnos)(e, t2, r), _bms_is_subset = Module._bms_is_subset = (e, t2) => (_bms_is_subset = Module._bms_is_subset = wasmExports.bms_is_subset)(e, t2), _getExtensionOfObject = Module._getExtensionOfObject = (e, t2) => (_getExtensionOfObject = Module._getExtensionOfObject = wasmExports.getExtensionOfObject)(e, t2), _find_inheritance_children = Module._find_inheritance_children = (e, t2) => (_find_inheritance_children = Module._find_inheritance_children = wasmExports.find_inheritance_children)(e, t2), _lappend_int = Module._lappend_int = (e, t2) => (_lappend_int = Module._lappend_int = wasmExports.lappend_int)(e, t2), _has_superclass = Module._has_superclass = (e) => (_has_superclass = Module._has_superclass = wasmExports.has_superclass)(e), _CheckFunctionValidatorAccess = Module._CheckFunctionValidatorAccess = (e, t2) => (_CheckFunctionValidatorAccess = Module._CheckFunctionValidatorAccess = wasmExports.CheckFunctionValidatorAccess)(e, t2), _AcquireRewriteLocks = Module._AcquireRewriteLocks = (e, t2, r) => (_AcquireRewriteLocks = Module._AcquireRewriteLocks = wasmExports.AcquireRewriteLocks)(e, t2, r), _function_parse_error_transpose = Module._function_parse_error_transpose = (e) => (_function_parse_error_transpose = Module._function_parse_error_transpose = wasmExports.function_parse_error_transpose)(e), _geterrposition = Module._geterrposition = () => (_geterrposition = Module._geterrposition = wasmExports.geterrposition)(), _getinternalerrposition = Module._getinternalerrposition = () => (_getinternalerrposition = Module._getinternalerrposition = wasmExports.getinternalerrposition)(), _pg_mblen = Module._pg_mblen = (e) => (_pg_mblen = Module._pg_mblen = wasmExports.pg_mblen)(e), _pg_mbstrlen_with_len = Module._pg_mbstrlen_with_len = (e, t2) => (_pg_mbstrlen_with_len = Module._pg_mbstrlen_with_len = wasmExports.pg_mbstrlen_with_len)(e, t2), _errposition = Module._errposition = (e) => (_errposition = Module._errposition = wasmExports.errposition)(e), _internalerrposition = Module._internalerrposition = (e) => (_internalerrposition = Module._internalerrposition = wasmExports.internalerrposition)(e), _internalerrquery = Module._internalerrquery = (e) => (_internalerrquery = Module._internalerrquery = wasmExports.internalerrquery)(e), _list_delete_nth_cell = Module._list_delete_nth_cell = (e, t2) => (_list_delete_nth_cell = Module._list_delete_nth_cell = wasmExports.list_delete_nth_cell)(e, t2), _get_array_type = Module._get_array_type = (e) => (_get_array_type = Module._get_array_type = wasmExports.get_array_type)(e), _smgrtruncate2 = Module._smgrtruncate2 = (e, t2, r, a2, s4) => (_smgrtruncate2 = Module._smgrtruncate2 = wasmExports.smgrtruncate2)(e, t2, r, a2, s4), _smgrreadv = Module._smgrreadv = (e, t2, r, a2, s4) => (_smgrreadv = Module._smgrreadv = wasmExports.smgrreadv)(e, t2, r, a2, s4), _NewRelationCreateToastTable = Module._NewRelationCreateToastTable = (e, t2) => (_NewRelationCreateToastTable = Module._NewRelationCreateToastTable = wasmExports.NewRelationCreateToastTable)(e, t2), _transformStmt = Module._transformStmt = (e, t2) => (_transformStmt = Module._transformStmt = wasmExports.transformStmt)(e, t2), _exprLocation = Module._exprLocation = (e) => (_exprLocation = Module._exprLocation = wasmExports.exprLocation)(e), _ParseFuncOrColumn = Module._ParseFuncOrColumn = (e, t2, r, a2, s4, o4, n3) => (_ParseFuncOrColumn = Module._ParseFuncOrColumn = wasmExports.ParseFuncOrColumn)(e, t2, r, a2, s4, o4, n3), _exprCollation = Module._exprCollation = (e) => (_exprCollation = Module._exprCollation = wasmExports.exprCollation)(e), _transformDistinctClause = Module._transformDistinctClause = (e, t2, r, a2) => (_transformDistinctClause = Module._transformDistinctClause = wasmExports.transformDistinctClause)(e, t2, r, a2), _makeTargetEntry = Module._makeTargetEntry = (e, t2, r, a2) => (_makeTargetEntry = Module._makeTargetEntry = wasmExports.makeTargetEntry)(e, t2, r, a2), _makeAlias = Module._makeAlias = (e, t2) => (_makeAlias = Module._makeAlias = wasmExports.makeAlias)(e, t2), _addRangeTableEntryForSubquery = Module._addRangeTableEntryForSubquery = (e, t2, r, a2, s4) => (_addRangeTableEntryForSubquery = Module._addRangeTableEntryForSubquery = wasmExports.addRangeTableEntryForSubquery)(e, t2, r, a2, s4), _makeVar = Module._makeVar = (e, t2, r, a2, s4, o4) => (_makeVar = Module._makeVar = wasmExports.makeVar)(e, t2, r, a2, s4, o4), _makeBoolean = Module._makeBoolean = (e) => (_makeBoolean = Module._makeBoolean = wasmExports.makeBoolean)(e), _makeInteger = Module._makeInteger = (e) => (_makeInteger = Module._makeInteger = wasmExports.makeInteger)(e), _makeTypeName = Module._makeTypeName = (e) => (_makeTypeName = Module._makeTypeName = wasmExports.makeTypeName)(e), _makeFuncCall = Module._makeFuncCall = (e, t2, r, a2) => (_makeFuncCall = Module._makeFuncCall = wasmExports.makeFuncCall)(e, t2, r, a2), _list_make4_impl = Module._list_make4_impl = (e, t2, r, a2, s4) => (_list_make4_impl = Module._list_make4_impl = wasmExports.list_make4_impl)(e, t2, r, a2, s4), _get_sortgroupclause_tle = Module._get_sortgroupclause_tle = (e, t2) => (_get_sortgroupclause_tle = Module._get_sortgroupclause_tle = wasmExports.get_sortgroupclause_tle)(e, t2), _flatten_join_alias_vars = Module._flatten_join_alias_vars = (e, t2, r) => (_flatten_join_alias_vars = Module._flatten_join_alias_vars = wasmExports.flatten_join_alias_vars)(e, t2, r), _list_member_int = Module._list_member_int = (e, t2) => (_list_member_int = Module._list_member_int = wasmExports.list_member_int)(e, t2), _addRangeTableEntryForENR = Module._addRangeTableEntryForENR = (e, t2, r) => (_addRangeTableEntryForENR = Module._addRangeTableEntryForENR = wasmExports.addRangeTableEntryForENR)(e, t2, r), _typenameTypeIdAndMod = Module._typenameTypeIdAndMod = (e, t2, r, a2) => (_typenameTypeIdAndMod = Module._typenameTypeIdAndMod = wasmExports.typenameTypeIdAndMod)(e, t2, r, a2), _get_typcollation = Module._get_typcollation = (e) => (_get_typcollation = Module._get_typcollation = wasmExports.get_typcollation)(e), _strip_implicit_coercions = Module._strip_implicit_coercions = (e) => (_strip_implicit_coercions = Module._strip_implicit_coercions = wasmExports.strip_implicit_coercions)(e), _get_sortgroupref_tle = Module._get_sortgroupref_tle = (e, t2) => (_get_sortgroupref_tle = Module._get_sortgroupref_tle = wasmExports.get_sortgroupref_tle)(e, t2), _contain_aggs_of_level = Module._contain_aggs_of_level = (e, t2) => (_contain_aggs_of_level = Module._contain_aggs_of_level = wasmExports.contain_aggs_of_level)(e, t2), _typeidType = Module._typeidType = (e) => (_typeidType = Module._typeidType = wasmExports.typeidType)(e), _typeTypeCollation = Module._typeTypeCollation = (e) => (_typeTypeCollation = Module._typeTypeCollation = wasmExports.typeTypeCollation)(e), _typeLen = Module._typeLen = (e) => (_typeLen = Module._typeLen = wasmExports.typeLen)(e), _typeByVal = Module._typeByVal = (e) => (_typeByVal = Module._typeByVal = wasmExports.typeByVal)(e), _makeConst = Module._makeConst = (e, t2, r, a2, s4, o4, n3) => (_makeConst = Module._makeConst = wasmExports.makeConst)(e, t2, r, a2, s4, o4, n3), _lookup_rowtype_tupdesc = Module._lookup_rowtype_tupdesc = (e, t2) => (_lookup_rowtype_tupdesc = Module._lookup_rowtype_tupdesc = wasmExports.lookup_rowtype_tupdesc)(e, t2), _bms_del_member = Module._bms_del_member = (e, t2) => (_bms_del_member = Module._bms_del_member = wasmExports.bms_del_member)(e, t2), _list_member = Module._list_member = (e, t2) => (_list_member = Module._list_member = wasmExports.list_member)(e, t2), _type_is_rowtype = Module._type_is_rowtype = (e) => (_type_is_rowtype = Module._type_is_rowtype = wasmExports.type_is_rowtype)(e), _bit_in = Module._bit_in = (e) => (_bit_in = Module._bit_in = wasmExports.bit_in)(e), _bms_union = Module._bms_union = (e, t2) => (_bms_union = Module._bms_union = wasmExports.bms_union)(e, t2), _varstr_levenshtein_less_equal = Module._varstr_levenshtein_less_equal = (e, t2, r, a2, s4, o4, n3, _3, l3) => (_varstr_levenshtein_less_equal = Module._varstr_levenshtein_less_equal = wasmExports.varstr_levenshtein_less_equal)(e, t2, r, a2, s4, o4, n3, _3, l3), _errsave_start = Module._errsave_start = (e, t2) => (_errsave_start = Module._errsave_start = wasmExports.errsave_start)(e, t2), _errsave_finish = Module._errsave_finish = (e, t2, r, a2) => (_errsave_finish = Module._errsave_finish = wasmExports.errsave_finish)(e, t2, r, a2), _makeColumnDef = Module._makeColumnDef = (e, t2, r, a2) => (_makeColumnDef = Module._makeColumnDef = wasmExports.makeColumnDef)(e, t2, r, a2), _GetDefaultOpClass = Module._GetDefaultOpClass = (e, t2) => (_GetDefaultOpClass = Module._GetDefaultOpClass = wasmExports.GetDefaultOpClass)(e, t2), _scanner_init = Module._scanner_init = (e, t2, r, a2) => (_scanner_init = Module._scanner_init = wasmExports.scanner_init)(e, t2, r, a2), _scanner_finish = Module._scanner_finish = (e) => (_scanner_finish = Module._scanner_finish = wasmExports.scanner_finish)(e), _core_yylex = Module._core_yylex = (e, t2, r) => (_core_yylex = Module._core_yylex = wasmExports.core_yylex)(e, t2, r), _isxdigit = Module._isxdigit = (e) => (_isxdigit = Module._isxdigit = wasmExports.isxdigit)(e), _scanner_isspace = Module._scanner_isspace = (e) => (_scanner_isspace = Module._scanner_isspace = wasmExports.scanner_isspace)(e), _truncate_identifier = Module._truncate_identifier = (e, t2, r) => (_truncate_identifier = Module._truncate_identifier = wasmExports.truncate_identifier)(e, t2, r), _pg_database_encoding_max_length = Module._pg_database_encoding_max_length = () => (_pg_database_encoding_max_length = Module._pg_database_encoding_max_length = wasmExports.pg_database_encoding_max_length)(), _namein = Module._namein = (e) => (_namein = Module._namein = wasmExports.namein)(e), _BlockSampler_Init = Module._BlockSampler_Init = (e, t2, r, a2) => (_BlockSampler_Init = Module._BlockSampler_Init = wasmExports.BlockSampler_Init)(e, t2, r, a2), _reservoir_init_selection_state = Module._reservoir_init_selection_state = (e, t2) => (_reservoir_init_selection_state = Module._reservoir_init_selection_state = wasmExports.reservoir_init_selection_state)(e, t2), _reservoir_get_next_S = Module._reservoir_get_next_S = (e, t2, r) => (_reservoir_get_next_S = Module._reservoir_get_next_S = wasmExports.reservoir_get_next_S)(e, t2, r), _sampler_random_fract = Module._sampler_random_fract = (e) => (_sampler_random_fract = Module._sampler_random_fract = wasmExports.sampler_random_fract)(e), _BlockSampler_HasMore = Module._BlockSampler_HasMore = (e) => (_BlockSampler_HasMore = Module._BlockSampler_HasMore = wasmExports.BlockSampler_HasMore)(e), _BlockSampler_Next = Module._BlockSampler_Next = (e) => (_BlockSampler_Next = Module._BlockSampler_Next = wasmExports.BlockSampler_Next)(e), _Async_Notify = Module._Async_Notify = (e, t2) => (_Async_Notify = Module._Async_Notify = wasmExports.Async_Notify)(e, t2), _RangeVarCallbackMaintainsTable = Module._RangeVarCallbackMaintainsTable = (e, t2, r, a2) => (_RangeVarCallbackMaintainsTable = Module._RangeVarCallbackMaintainsTable = wasmExports.RangeVarCallbackMaintainsTable)(e, t2, r, a2), _make_new_heap = Module._make_new_heap = (e, t2, r, a2, s4) => (_make_new_heap = Module._make_new_heap = wasmExports.make_new_heap)(e, t2, r, a2, s4), _finish_heap_swap = Module._finish_heap_swap = (e, t2, r, a2, s4, o4, n3, _3, l3) => (_finish_heap_swap = Module._finish_heap_swap = wasmExports.finish_heap_swap)(e, t2, r, a2, s4, o4, n3, _3, l3), _wasm_OpenPipeStream = Module._wasm_OpenPipeStream = (e, t2) => (_wasm_OpenPipeStream = Module._wasm_OpenPipeStream = wasmExports.wasm_OpenPipeStream)(e, t2), _ClosePipeStream = Module._ClosePipeStream = (e) => (_ClosePipeStream = Module._ClosePipeStream = wasmExports.ClosePipeStream)(e), _BeginCopyFrom = Module._BeginCopyFrom = (e, t2, r, a2, s4, o4, n3, _3) => (_BeginCopyFrom = Module._BeginCopyFrom = wasmExports.BeginCopyFrom)(e, t2, r, a2, s4, o4, n3, _3), _EndCopyFrom = Module._EndCopyFrom = (e) => (_EndCopyFrom = Module._EndCopyFrom = wasmExports.EndCopyFrom)(e), _ProcessCopyOptions = Module._ProcessCopyOptions = (e, t2, r, a2) => (_ProcessCopyOptions = Module._ProcessCopyOptions = wasmExports.ProcessCopyOptions)(e, t2, r, a2), _CopyFromErrorCallback = Module._CopyFromErrorCallback = (e) => (_CopyFromErrorCallback = Module._CopyFromErrorCallback = wasmExports.CopyFromErrorCallback)(e), _NextCopyFrom = Module._NextCopyFrom = (e, t2, r, a2) => (_NextCopyFrom = Module._NextCopyFrom = wasmExports.NextCopyFrom)(e, t2, r, a2), _ExecInitExpr = Module._ExecInitExpr = (e, t2) => (_ExecInitExpr = Module._ExecInitExpr = wasmExports.ExecInitExpr)(e, t2), _tolower = Module._tolower = (e) => (_tolower = Module._tolower = wasmExports.tolower)(e), _PushCopiedSnapshot = Module._PushCopiedSnapshot = (e) => (_PushCopiedSnapshot = Module._PushCopiedSnapshot = wasmExports.PushCopiedSnapshot)(e), _UpdateActiveSnapshotCommandId = Module._UpdateActiveSnapshotCommandId = () => (_UpdateActiveSnapshotCommandId = Module._UpdateActiveSnapshotCommandId = wasmExports.UpdateActiveSnapshotCommandId)(), _CreateQueryDesc = Module._CreateQueryDesc = (e, t2, r, a2, s4, o4, n3, _3) => (_CreateQueryDesc = Module._CreateQueryDesc = wasmExports.CreateQueryDesc)(e, t2, r, a2, s4, o4, n3, _3), _ExecutorStart = Module._ExecutorStart = (e, t2) => (_ExecutorStart = Module._ExecutorStart = wasmExports.ExecutorStart)(e, t2), _ExecutorFinish = Module._ExecutorFinish = (e) => (_ExecutorFinish = Module._ExecutorFinish = wasmExports.ExecutorFinish)(e), _ExecutorEnd = Module._ExecutorEnd = (e) => (_ExecutorEnd = Module._ExecutorEnd = wasmExports.ExecutorEnd)(e), _FreeQueryDesc = Module._FreeQueryDesc = (e) => (_FreeQueryDesc = Module._FreeQueryDesc = wasmExports.FreeQueryDesc)(e), _pg_server_to_any = Module._pg_server_to_any = (e, t2, r) => (_pg_server_to_any = Module._pg_server_to_any = wasmExports.pg_server_to_any)(e, t2, r), _ExecutorRun = Module._ExecutorRun = (e, t2, r, a2) => (_ExecutorRun = Module._ExecutorRun = wasmExports.ExecutorRun)(e, t2, r, a2), _CreateTableAsRelExists = Module._CreateTableAsRelExists = (e) => (_CreateTableAsRelExists = Module._CreateTableAsRelExists = wasmExports.CreateTableAsRelExists)(e), _DefineRelation = Module._DefineRelation = (e, t2, r, a2, s4, o4) => (_DefineRelation = Module._DefineRelation = wasmExports.DefineRelation)(e, t2, r, a2, s4, o4), _oidin = Module._oidin = (e) => (_oidin = Module._oidin = wasmExports.oidin)(e), _GetCommandTagName = Module._GetCommandTagName = (e) => (_GetCommandTagName = Module._GetCommandTagName = wasmExports.GetCommandTagName)(e), _ExplainBeginOutput = Module._ExplainBeginOutput = (e) => (_ExplainBeginOutput = Module._ExplainBeginOutput = wasmExports.ExplainBeginOutput)(e), _NewExplainState = Module._NewExplainState = () => (_NewExplainState = Module._NewExplainState = wasmExports.NewExplainState)(), _ExplainEndOutput = Module._ExplainEndOutput = (e) => (_ExplainEndOutput = Module._ExplainEndOutput = wasmExports.ExplainEndOutput)(e), _ExplainPrintPlan = Module._ExplainPrintPlan = (e, t2) => (_ExplainPrintPlan = Module._ExplainPrintPlan = wasmExports.ExplainPrintPlan)(e, t2), _ExplainPrintTriggers = Module._ExplainPrintTriggers = (e, t2) => (_ExplainPrintTriggers = Module._ExplainPrintTriggers = wasmExports.ExplainPrintTriggers)(e, t2), _ExplainPrintJITSummary = Module._ExplainPrintJITSummary = (e, t2) => (_ExplainPrintJITSummary = Module._ExplainPrintJITSummary = wasmExports.ExplainPrintJITSummary)(e, t2), _InstrEndLoop = Module._InstrEndLoop = (e) => (_InstrEndLoop = Module._InstrEndLoop = wasmExports.InstrEndLoop)(e), _ExplainPropertyInteger = Module._ExplainPropertyInteger = (e, t2, r, a2) => (_ExplainPropertyInteger = Module._ExplainPropertyInteger = wasmExports.ExplainPropertyInteger)(e, t2, r, a2), _ExplainQueryText = Module._ExplainQueryText = (e, t2) => (_ExplainQueryText = Module._ExplainQueryText = wasmExports.ExplainQueryText)(e, t2), _ExplainPropertyText = Module._ExplainPropertyText = (e, t2, r) => (_ExplainPropertyText = Module._ExplainPropertyText = wasmExports.ExplainPropertyText)(e, t2, r), _ExplainQueryParameters = Module._ExplainQueryParameters = (e, t2, r) => (_ExplainQueryParameters = Module._ExplainQueryParameters = wasmExports.ExplainQueryParameters)(e, t2, r), _get_func_namespace = Module._get_func_namespace = (e) => (_get_func_namespace = Module._get_func_namespace = wasmExports.get_func_namespace)(e), _get_rel_type_id = Module._get_rel_type_id = (e) => (_get_rel_type_id = Module._get_rel_type_id = wasmExports.get_rel_type_id)(e), _set_config_option = Module._set_config_option = (e, t2, r, a2, s4, o4, n3, _3) => (_set_config_option = Module._set_config_option = wasmExports.set_config_option)(e, t2, r, a2, s4, o4, n3, _3), _pg_any_to_server = Module._pg_any_to_server = (e, t2, r) => (_pg_any_to_server = Module._pg_any_to_server = wasmExports.pg_any_to_server)(e, t2, r), _DirectFunctionCall4Coll = Module._DirectFunctionCall4Coll = (e, t2, r, a2, s4, o4) => (_DirectFunctionCall4Coll = Module._DirectFunctionCall4Coll = wasmExports.DirectFunctionCall4Coll)(e, t2, r, a2, s4, o4), _list_delete_cell = Module._list_delete_cell = (e, t2) => (_list_delete_cell = Module._list_delete_cell = wasmExports.list_delete_cell)(e, t2), _GetForeignDataWrapper = Module._GetForeignDataWrapper = (e) => (_GetForeignDataWrapper = Module._GetForeignDataWrapper = wasmExports.GetForeignDataWrapper)(e), _CreateExprContext = Module._CreateExprContext = (e) => (_CreateExprContext = Module._CreateExprContext = wasmExports.CreateExprContext)(e), _EnsurePortalSnapshotExists = Module._EnsurePortalSnapshotExists = () => (_EnsurePortalSnapshotExists = Module._EnsurePortalSnapshotExists = wasmExports.EnsurePortalSnapshotExists)(), _CheckIndexCompatible = Module._CheckIndexCompatible = (e, t2, r, a2) => (_CheckIndexCompatible = Module._CheckIndexCompatible = wasmExports.CheckIndexCompatible)(e, t2, r, a2), _pgstat_count_truncate = Module._pgstat_count_truncate = (e) => (_pgstat_count_truncate = Module._pgstat_count_truncate = wasmExports.pgstat_count_truncate)(e), _SPI_connect = Module._SPI_connect = () => (_SPI_connect = Module._SPI_connect = wasmExports.SPI_connect)(), _SPI_exec = Module._SPI_exec = (e, t2) => (_SPI_exec = Module._SPI_exec = wasmExports.SPI_exec)(e, t2), _SPI_execute = Module._SPI_execute = (e, t2, r) => (_SPI_execute = Module._SPI_execute = wasmExports.SPI_execute)(e, t2, r), _SPI_getvalue = Module._SPI_getvalue = (e, t2, r) => (_SPI_getvalue = Module._SPI_getvalue = wasmExports.SPI_getvalue)(e, t2, r), _generate_operator_clause = Module._generate_operator_clause = (e, t2, r, a2, s4, o4) => (_generate_operator_clause = Module._generate_operator_clause = wasmExports.generate_operator_clause)(e, t2, r, a2, s4, o4), _SPI_finish = Module._SPI_finish = () => (_SPI_finish = Module._SPI_finish = wasmExports.SPI_finish)(), _CreateTransientRelDestReceiver = Module._CreateTransientRelDestReceiver = (e) => (_CreateTransientRelDestReceiver = Module._CreateTransientRelDestReceiver = wasmExports.CreateTransientRelDestReceiver)(e), _MemoryContextSetIdentifier = Module._MemoryContextSetIdentifier = (e, t2) => (_MemoryContextSetIdentifier = Module._MemoryContextSetIdentifier = wasmExports.MemoryContextSetIdentifier)(e, t2), _checkExprHasSubLink = Module._checkExprHasSubLink = (e) => (_checkExprHasSubLink = Module._checkExprHasSubLink = wasmExports.checkExprHasSubLink)(e), _SetTuplestoreDestReceiverParams = Module._SetTuplestoreDestReceiverParams = (e, t2, r, a2, s4, o4) => (_SetTuplestoreDestReceiverParams = Module._SetTuplestoreDestReceiverParams = wasmExports.SetTuplestoreDestReceiverParams)(e, t2, r, a2, s4, o4), _tuplestore_rescan = Module._tuplestore_rescan = (e) => (_tuplestore_rescan = Module._tuplestore_rescan = wasmExports.tuplestore_rescan)(e), _MemoryContextDeleteChildren = Module._MemoryContextDeleteChildren = (e) => (_MemoryContextDeleteChildren = Module._MemoryContextDeleteChildren = wasmExports.MemoryContextDeleteChildren)(e), _ReleaseCachedPlan = Module._ReleaseCachedPlan = (e, t2) => (_ReleaseCachedPlan = Module._ReleaseCachedPlan = wasmExports.ReleaseCachedPlan)(e, t2), _nextval = Module._nextval = (e) => (_nextval = Module._nextval = wasmExports.nextval)(e), _textToQualifiedNameList = Module._textToQualifiedNameList = (e) => (_textToQualifiedNameList = Module._textToQualifiedNameList = wasmExports.textToQualifiedNameList)(e), _tuplestore_gettupleslot = Module._tuplestore_gettupleslot = (e, t2, r, a2) => (_tuplestore_gettupleslot = Module._tuplestore_gettupleslot = wasmExports.tuplestore_gettupleslot)(e, t2, r, a2), _list_delete = Module._list_delete = (e, t2) => (_list_delete = Module._list_delete = wasmExports.list_delete)(e, t2), _tuplestore_end = Module._tuplestore_end = (e) => (_tuplestore_end = Module._tuplestore_end = wasmExports.tuplestore_end)(e), _quote_literal_cstr = Module._quote_literal_cstr = (e) => (_quote_literal_cstr = Module._quote_literal_cstr = wasmExports.quote_literal_cstr)(e), _contain_mutable_functions = Module._contain_mutable_functions = (e) => (_contain_mutable_functions = Module._contain_mutable_functions = wasmExports.contain_mutable_functions)(e), _ExecuteTruncateGuts = Module._ExecuteTruncateGuts = (e, t2, r, a2, s4, o4) => (_ExecuteTruncateGuts = Module._ExecuteTruncateGuts = wasmExports.ExecuteTruncateGuts)(e, t2, r, a2, s4, o4), _bms_make_singleton = Module._bms_make_singleton = (e) => (_bms_make_singleton = Module._bms_make_singleton = wasmExports.bms_make_singleton)(e), _tuplestore_puttupleslot = Module._tuplestore_puttupleslot = (e, t2) => (_tuplestore_puttupleslot = Module._tuplestore_puttupleslot = wasmExports.tuplestore_puttupleslot)(e, t2), _tuplestore_begin_heap = Module._tuplestore_begin_heap = (e, t2, r) => (_tuplestore_begin_heap = Module._tuplestore_begin_heap = wasmExports.tuplestore_begin_heap)(e, t2, r), _ExecForceStoreHeapTuple = Module._ExecForceStoreHeapTuple = (e, t2, r) => (_ExecForceStoreHeapTuple = Module._ExecForceStoreHeapTuple = wasmExports.ExecForceStoreHeapTuple)(e, t2, r), _strtod = Module._strtod = (e, t2) => (_strtod = Module._strtod = wasmExports.strtod)(e, t2), _plain_crypt_verify = Module._plain_crypt_verify = (e, t2, r, a2) => (_plain_crypt_verify = Module._plain_crypt_verify = wasmExports.plain_crypt_verify)(e, t2, r, a2), _ProcessConfigFile = Module._ProcessConfigFile = (e) => (_ProcessConfigFile = Module._ProcessConfigFile = wasmExports.ProcessConfigFile)(e), _ExecReScan = Module._ExecReScan = (e) => (_ExecReScan = Module._ExecReScan = wasmExports.ExecReScan)(e), _ExecAsyncResponse = Module._ExecAsyncResponse = (e) => (_ExecAsyncResponse = Module._ExecAsyncResponse = wasmExports.ExecAsyncResponse)(e), _ExecAsyncRequestDone = Module._ExecAsyncRequestDone = (e, t2) => (_ExecAsyncRequestDone = Module._ExecAsyncRequestDone = wasmExports.ExecAsyncRequestDone)(e, t2), _ExecAsyncRequestPending = Module._ExecAsyncRequestPending = (e) => (_ExecAsyncRequestPending = Module._ExecAsyncRequestPending = wasmExports.ExecAsyncRequestPending)(e), _ExprEvalPushStep = Module._ExprEvalPushStep = (e, t2) => (_ExprEvalPushStep = Module._ExprEvalPushStep = wasmExports.ExprEvalPushStep)(e, t2), _ExecInitExprWithParams = Module._ExecInitExprWithParams = (e, t2) => (_ExecInitExprWithParams = Module._ExecInitExprWithParams = wasmExports.ExecInitExprWithParams)(e, t2), _ExecInitExprList = Module._ExecInitExprList = (e, t2) => (_ExecInitExprList = Module._ExecInitExprList = wasmExports.ExecInitExprList)(e, t2), _MakeExpandedObjectReadOnlyInternal = Module._MakeExpandedObjectReadOnlyInternal = (e) => (_MakeExpandedObjectReadOnlyInternal = Module._MakeExpandedObjectReadOnlyInternal = wasmExports.MakeExpandedObjectReadOnlyInternal)(e), _tuplesort_puttupleslot = Module._tuplesort_puttupleslot = (e, t2) => (_tuplesort_puttupleslot = Module._tuplesort_puttupleslot = wasmExports.tuplesort_puttupleslot)(e, t2), _ArrayGetNItems = Module._ArrayGetNItems = (e, t2) => (_ArrayGetNItems = Module._ArrayGetNItems = wasmExports.ArrayGetNItems)(e, t2), _expanded_record_fetch_tupdesc = Module._expanded_record_fetch_tupdesc = (e) => (_expanded_record_fetch_tupdesc = Module._expanded_record_fetch_tupdesc = wasmExports.expanded_record_fetch_tupdesc)(e), _expanded_record_fetch_field = Module._expanded_record_fetch_field = (e, t2, r) => (_expanded_record_fetch_field = Module._expanded_record_fetch_field = wasmExports.expanded_record_fetch_field)(e, t2, r), _JsonbValueToJsonb = Module._JsonbValueToJsonb = (e) => (_JsonbValueToJsonb = Module._JsonbValueToJsonb = wasmExports.JsonbValueToJsonb)(e), _boolout = Module._boolout = (e) => (_boolout = Module._boolout = wasmExports.boolout)(e), _lookup_rowtype_tupdesc_domain = Module._lookup_rowtype_tupdesc_domain = (e, t2, r) => (_lookup_rowtype_tupdesc_domain = Module._lookup_rowtype_tupdesc_domain = wasmExports.lookup_rowtype_tupdesc_domain)(e, t2, r), _MemoryContextGetParent = Module._MemoryContextGetParent = (e) => (_MemoryContextGetParent = Module._MemoryContextGetParent = wasmExports.MemoryContextGetParent)(e), _DeleteExpandedObject = Module._DeleteExpandedObject = (e) => (_DeleteExpandedObject = Module._DeleteExpandedObject = wasmExports.DeleteExpandedObject)(e), _ExecFindJunkAttributeInTlist = Module._ExecFindJunkAttributeInTlist = (e, t2) => (_ExecFindJunkAttributeInTlist = Module._ExecFindJunkAttributeInTlist = wasmExports.ExecFindJunkAttributeInTlist)(e, t2), _standard_ExecutorStart = Module._standard_ExecutorStart = (e, t2) => (_standard_ExecutorStart = Module._standard_ExecutorStart = wasmExports.standard_ExecutorStart)(e, t2), _standard_ExecutorRun = Module._standard_ExecutorRun = (e, t2, r, a2) => (_standard_ExecutorRun = Module._standard_ExecutorRun = wasmExports.standard_ExecutorRun)(e, t2, r, a2), _standard_ExecutorFinish = Module._standard_ExecutorFinish = (e) => (_standard_ExecutorFinish = Module._standard_ExecutorFinish = wasmExports.standard_ExecutorFinish)(e), _standard_ExecutorEnd = Module._standard_ExecutorEnd = (e) => (_standard_ExecutorEnd = Module._standard_ExecutorEnd = wasmExports.standard_ExecutorEnd)(e), _InstrAlloc = Module._InstrAlloc = (e, t2, r) => (_InstrAlloc = Module._InstrAlloc = wasmExports.InstrAlloc)(e, t2, r), _get_typlenbyval = Module._get_typlenbyval = (e, t2, r) => (_get_typlenbyval = Module._get_typlenbyval = wasmExports.get_typlenbyval)(e, t2, r), _InputFunctionCall = Module._InputFunctionCall = (e, t2, r, a2) => (_InputFunctionCall = Module._InputFunctionCall = wasmExports.InputFunctionCall)(e, t2, r, a2), _FreeExprContext = Module._FreeExprContext = (e, t2) => (_FreeExprContext = Module._FreeExprContext = wasmExports.FreeExprContext)(e, t2), _ExecOpenScanRelation = Module._ExecOpenScanRelation = (e, t2, r) => (_ExecOpenScanRelation = Module._ExecOpenScanRelation = wasmExports.ExecOpenScanRelation)(e, t2, r), _bms_intersect = Module._bms_intersect = (e, t2) => (_bms_intersect = Module._bms_intersect = wasmExports.bms_intersect)(e, t2), _ExecGetReturningSlot = Module._ExecGetReturningSlot = (e, t2) => (_ExecGetReturningSlot = Module._ExecGetReturningSlot = wasmExports.ExecGetReturningSlot)(e, t2), _ExecGetResultRelCheckAsUser = Module._ExecGetResultRelCheckAsUser = (e, t2) => (_ExecGetResultRelCheckAsUser = Module._ExecGetResultRelCheckAsUser = wasmExports.ExecGetResultRelCheckAsUser)(e, t2), _get_call_expr_argtype = Module._get_call_expr_argtype = (e, t2) => (_get_call_expr_argtype = Module._get_call_expr_argtype = wasmExports.get_call_expr_argtype)(e, t2), _tuplestore_clear = Module._tuplestore_clear = (e) => (_tuplestore_clear = Module._tuplestore_clear = wasmExports.tuplestore_clear)(e), _InstrUpdateTupleCount = Module._InstrUpdateTupleCount = (e, t2) => (_InstrUpdateTupleCount = Module._InstrUpdateTupleCount = wasmExports.InstrUpdateTupleCount)(e, t2), _tuplesort_begin_heap = Module._tuplesort_begin_heap = (e, t2, r, a2, s4, o4, n3, _3, l3) => (_tuplesort_begin_heap = Module._tuplesort_begin_heap = wasmExports.tuplesort_begin_heap)(e, t2, r, a2, s4, o4, n3, _3, l3), _tuplesort_gettupleslot = Module._tuplesort_gettupleslot = (e, t2, r, a2, s4) => (_tuplesort_gettupleslot = Module._tuplesort_gettupleslot = wasmExports.tuplesort_gettupleslot)(e, t2, r, a2, s4), _AddWaitEventToSet = Module._AddWaitEventToSet = (e, t2, r, a2, s4) => (_AddWaitEventToSet = Module._AddWaitEventToSet = wasmExports.AddWaitEventToSet)(e, t2, r, a2, s4), _GetNumRegisteredWaitEvents = Module._GetNumRegisteredWaitEvents = (e) => (_GetNumRegisteredWaitEvents = Module._GetNumRegisteredWaitEvents = wasmExports.GetNumRegisteredWaitEvents)(e), _get_attstatsslot = Module._get_attstatsslot = (e, t2, r, a2, s4) => (_get_attstatsslot = Module._get_attstatsslot = wasmExports.get_attstatsslot)(e, t2, r, a2, s4), _free_attstatsslot = Module._free_attstatsslot = (e) => (_free_attstatsslot = Module._free_attstatsslot = wasmExports.free_attstatsslot)(e), _tuplesort_reset = Module._tuplesort_reset = (e) => (_tuplesort_reset = Module._tuplesort_reset = wasmExports.tuplesort_reset)(e), _pairingheap_first = Module._pairingheap_first = (e) => (_pairingheap_first = Module._pairingheap_first = wasmExports.pairingheap_first)(e), _bms_nonempty_difference = Module._bms_nonempty_difference = (e, t2) => (_bms_nonempty_difference = Module._bms_nonempty_difference = wasmExports.bms_nonempty_difference)(e, t2), _SPI_connect_ext = Module._SPI_connect_ext = (e) => (_SPI_connect_ext = Module._SPI_connect_ext = wasmExports.SPI_connect_ext)(e), _SPI_commit = Module._SPI_commit = () => (_SPI_commit = Module._SPI_commit = wasmExports.SPI_commit)(), _CopyErrorData = Module._CopyErrorData = () => (_CopyErrorData = Module._CopyErrorData = wasmExports.CopyErrorData)(), _ReThrowError = Module._ReThrowError = (e) => (_ReThrowError = Module._ReThrowError = wasmExports.ReThrowError)(e), _SPI_commit_and_chain = Module._SPI_commit_and_chain = () => (_SPI_commit_and_chain = Module._SPI_commit_and_chain = wasmExports.SPI_commit_and_chain)(), _SPI_rollback = Module._SPI_rollback = () => (_SPI_rollback = Module._SPI_rollback = wasmExports.SPI_rollback)(), _SPI_rollback_and_chain = Module._SPI_rollback_and_chain = () => (_SPI_rollback_and_chain = Module._SPI_rollback_and_chain = wasmExports.SPI_rollback_and_chain)(), _SPI_freetuptable = Module._SPI_freetuptable = (e) => (_SPI_freetuptable = Module._SPI_freetuptable = wasmExports.SPI_freetuptable)(e), _SPI_execute_extended = Module._SPI_execute_extended = (e, t2) => (_SPI_execute_extended = Module._SPI_execute_extended = wasmExports.SPI_execute_extended)(e, t2), _SPI_execute_plan = Module._SPI_execute_plan = (e, t2, r, a2, s4) => (_SPI_execute_plan = Module._SPI_execute_plan = wasmExports.SPI_execute_plan)(e, t2, r, a2, s4), _SPI_execp = Module._SPI_execp = (e, t2, r, a2) => (_SPI_execp = Module._SPI_execp = wasmExports.SPI_execp)(e, t2, r, a2), _SPI_execute_plan_extended = Module._SPI_execute_plan_extended = (e, t2) => (_SPI_execute_plan_extended = Module._SPI_execute_plan_extended = wasmExports.SPI_execute_plan_extended)(e, t2), _SPI_execute_plan_with_paramlist = Module._SPI_execute_plan_with_paramlist = (e, t2, r, a2) => (_SPI_execute_plan_with_paramlist = Module._SPI_execute_plan_with_paramlist = wasmExports.SPI_execute_plan_with_paramlist)(e, t2, r, a2), _SPI_prepare = Module._SPI_prepare = (e, t2, r) => (_SPI_prepare = Module._SPI_prepare = wasmExports.SPI_prepare)(e, t2, r), _SPI_prepare_extended = Module._SPI_prepare_extended = (e, t2) => (_SPI_prepare_extended = Module._SPI_prepare_extended = wasmExports.SPI_prepare_extended)(e, t2), _SPI_keepplan = Module._SPI_keepplan = (e) => (_SPI_keepplan = Module._SPI_keepplan = wasmExports.SPI_keepplan)(e), _SPI_freeplan = Module._SPI_freeplan = (e) => (_SPI_freeplan = Module._SPI_freeplan = wasmExports.SPI_freeplan)(e), _SPI_copytuple = Module._SPI_copytuple = (e) => (_SPI_copytuple = Module._SPI_copytuple = wasmExports.SPI_copytuple)(e), _SPI_returntuple = Module._SPI_returntuple = (e, t2) => (_SPI_returntuple = Module._SPI_returntuple = wasmExports.SPI_returntuple)(e, t2), _SPI_fnumber = Module._SPI_fnumber = (e, t2) => (_SPI_fnumber = Module._SPI_fnumber = wasmExports.SPI_fnumber)(e, t2), _SPI_fname = Module._SPI_fname = (e, t2) => (_SPI_fname = Module._SPI_fname = wasmExports.SPI_fname)(e, t2), _SPI_getbinval = Module._SPI_getbinval = (e, t2, r, a2) => (_SPI_getbinval = Module._SPI_getbinval = wasmExports.SPI_getbinval)(e, t2, r, a2), _SPI_gettype = Module._SPI_gettype = (e, t2) => (_SPI_gettype = Module._SPI_gettype = wasmExports.SPI_gettype)(e, t2), _SPI_gettypeid = Module._SPI_gettypeid = (e, t2) => (_SPI_gettypeid = Module._SPI_gettypeid = wasmExports.SPI_gettypeid)(e, t2), _SPI_getrelname = Module._SPI_getrelname = (e) => (_SPI_getrelname = Module._SPI_getrelname = wasmExports.SPI_getrelname)(e), _SPI_palloc = Module._SPI_palloc = (e) => (_SPI_palloc = Module._SPI_palloc = wasmExports.SPI_palloc)(e), _SPI_datumTransfer = Module._SPI_datumTransfer = (e, t2, r) => (_SPI_datumTransfer = Module._SPI_datumTransfer = wasmExports.SPI_datumTransfer)(e, t2, r), _datumTransfer = Module._datumTransfer = (e, t2, r) => (_datumTransfer = Module._datumTransfer = wasmExports.datumTransfer)(e, t2, r), _SPI_cursor_open_with_paramlist = Module._SPI_cursor_open_with_paramlist = (e, t2, r, a2) => (_SPI_cursor_open_with_paramlist = Module._SPI_cursor_open_with_paramlist = wasmExports.SPI_cursor_open_with_paramlist)(e, t2, r, a2), _SPI_cursor_parse_open = Module._SPI_cursor_parse_open = (e, t2, r) => (_SPI_cursor_parse_open = Module._SPI_cursor_parse_open = wasmExports.SPI_cursor_parse_open)(e, t2, r), _SPI_cursor_find = Module._SPI_cursor_find = (e) => (_SPI_cursor_find = Module._SPI_cursor_find = wasmExports.SPI_cursor_find)(e), _SPI_cursor_fetch = Module._SPI_cursor_fetch = (e, t2, r) => (_SPI_cursor_fetch = Module._SPI_cursor_fetch = wasmExports.SPI_cursor_fetch)(e, t2, r), _SPI_scroll_cursor_fetch = Module._SPI_scroll_cursor_fetch = (e, t2, r) => (_SPI_scroll_cursor_fetch = Module._SPI_scroll_cursor_fetch = wasmExports.SPI_scroll_cursor_fetch)(e, t2, r), _SPI_scroll_cursor_move = Module._SPI_scroll_cursor_move = (e, t2, r) => (_SPI_scroll_cursor_move = Module._SPI_scroll_cursor_move = wasmExports.SPI_scroll_cursor_move)(e, t2, r), _SPI_cursor_close = Module._SPI_cursor_close = (e) => (_SPI_cursor_close = Module._SPI_cursor_close = wasmExports.SPI_cursor_close)(e), _SPI_plan_is_valid = Module._SPI_plan_is_valid = (e) => (_SPI_plan_is_valid = Module._SPI_plan_is_valid = wasmExports.SPI_plan_is_valid)(e), _SPI_result_code_string = Module._SPI_result_code_string = (e) => (_SPI_result_code_string = Module._SPI_result_code_string = wasmExports.SPI_result_code_string)(e), _SPI_plan_get_plan_sources = Module._SPI_plan_get_plan_sources = (e) => (_SPI_plan_get_plan_sources = Module._SPI_plan_get_plan_sources = wasmExports.SPI_plan_get_plan_sources)(e), _SPI_plan_get_cached_plan = Module._SPI_plan_get_cached_plan = (e) => (_SPI_plan_get_cached_plan = Module._SPI_plan_get_cached_plan = wasmExports.SPI_plan_get_cached_plan)(e), _SPI_register_relation = Module._SPI_register_relation = (e) => (_SPI_register_relation = Module._SPI_register_relation = wasmExports.SPI_register_relation)(e), _create_queryEnv = Module._create_queryEnv = () => (_create_queryEnv = Module._create_queryEnv = wasmExports.create_queryEnv)(), _register_ENR = Module._register_ENR = (e, t2) => (_register_ENR = Module._register_ENR = wasmExports.register_ENR)(e, t2), _SPI_register_trigger_data = Module._SPI_register_trigger_data = (e) => (_SPI_register_trigger_data = Module._SPI_register_trigger_data = wasmExports.SPI_register_trigger_data)(e), _tuplestore_tuple_count = Module._tuplestore_tuple_count = (e) => (_tuplestore_tuple_count = Module._tuplestore_tuple_count = wasmExports.tuplestore_tuple_count)(e), _GetUserMapping = Module._GetUserMapping = (e, t2) => (_GetUserMapping = Module._GetUserMapping = wasmExports.GetUserMapping)(e, t2), _GetForeignTable = Module._GetForeignTable = (e) => (_GetForeignTable = Module._GetForeignTable = wasmExports.GetForeignTable)(e), _GetForeignColumnOptions = Module._GetForeignColumnOptions = (e, t2) => (_GetForeignColumnOptions = Module._GetForeignColumnOptions = wasmExports.GetForeignColumnOptions)(e, t2), _initClosestMatch = Module._initClosestMatch = (e, t2, r) => (_initClosestMatch = Module._initClosestMatch = wasmExports.initClosestMatch)(e, t2, r), _updateClosestMatch = Module._updateClosestMatch = (e, t2) => (_updateClosestMatch = Module._updateClosestMatch = wasmExports.updateClosestMatch)(e, t2), _getClosestMatch = Module._getClosestMatch = (e) => (_getClosestMatch = Module._getClosestMatch = wasmExports.getClosestMatch)(e), _GetExistingLocalJoinPath = Module._GetExistingLocalJoinPath = (e) => (_GetExistingLocalJoinPath = Module._GetExistingLocalJoinPath = wasmExports.GetExistingLocalJoinPath)(e), _bloom_create = Module._bloom_create = (e, t2, r) => (_bloom_create = Module._bloom_create = wasmExports.bloom_create)(e, t2, r), _bloom_free = Module._bloom_free = (e) => (_bloom_free = Module._bloom_free = wasmExports.bloom_free)(e), _bloom_add_element = Module._bloom_add_element = (e, t2, r) => (_bloom_add_element = Module._bloom_add_element = wasmExports.bloom_add_element)(e, t2, r), _bloom_lacks_element = Module._bloom_lacks_element = (e, t2, r) => (_bloom_lacks_element = Module._bloom_lacks_element = wasmExports.bloom_lacks_element)(e, t2, r), _bloom_prop_bits_set = Module._bloom_prop_bits_set = (e) => (_bloom_prop_bits_set = Module._bloom_prop_bits_set = wasmExports.bloom_prop_bits_set)(e), _socket = Module._socket = (e, t2, r) => (_socket = Module._socket = wasmExports.socket)(e, t2, r), _connect = Module._connect = (e, t2, r) => (_connect = Module._connect = wasmExports.connect)(e, t2, r), _send = Module._send = (e, t2, r, a2) => (_send = Module._send = wasmExports.send)(e, t2, r, a2), _recv = Module._recv = (e, t2, r, a2) => (_recv = Module._recv = wasmExports.recv)(e, t2, r, a2), _be_lo_unlink = Module._be_lo_unlink = (e) => (_be_lo_unlink = Module._be_lo_unlink = wasmExports.be_lo_unlink)(e), _set_read_write_cbs = Module._set_read_write_cbs = (e, t2) => (_set_read_write_cbs = Module._set_read_write_cbs = wasmExports.set_read_write_cbs)(e, t2), _setsockopt = Module._setsockopt = (e, t2, r, a2, s4) => (_setsockopt = Module._setsockopt = wasmExports.setsockopt)(e, t2, r, a2, s4), _getsockopt = Module._getsockopt = (e, t2, r, a2, s4) => (_getsockopt = Module._getsockopt = wasmExports.getsockopt)(e, t2, r, a2, s4), _getsockname = Module._getsockname = (e, t2, r) => (_getsockname = Module._getsockname = wasmExports.getsockname)(e, t2, r), _poll = Module._poll = (e, t2, r) => (_poll = Module._poll = wasmExports.poll)(e, t2, r), _pg_mb2wchar_with_len = Module._pg_mb2wchar_with_len = (e, t2, r) => (_pg_mb2wchar_with_len = Module._pg_mb2wchar_with_len = wasmExports.pg_mb2wchar_with_len)(e, t2, r), _pg_regcomp = Module._pg_regcomp = (e, t2, r, a2, s4) => (_pg_regcomp = Module._pg_regcomp = wasmExports.pg_regcomp)(e, t2, r, a2, s4), _pg_regerror = Module._pg_regerror = (e, t2, r, a2) => (_pg_regerror = Module._pg_regerror = wasmExports.pg_regerror)(e, t2, r, a2), _strcat = Module._strcat = (e, t2) => (_strcat = Module._strcat = wasmExports.strcat)(e, t2), _pq_sendtext = Module._pq_sendtext = (e, t2, r) => (_pq_sendtext = Module._pq_sendtext = wasmExports.pq_sendtext)(e, t2, r), _pq_sendfloat4 = Module._pq_sendfloat4 = (e, t2) => (_pq_sendfloat4 = Module._pq_sendfloat4 = wasmExports.pq_sendfloat4)(e, t2), _pq_sendfloat8 = Module._pq_sendfloat8 = (e, t2) => (_pq_sendfloat8 = Module._pq_sendfloat8 = wasmExports.pq_sendfloat8)(e, t2), _pq_begintypsend = Module._pq_begintypsend = (e) => (_pq_begintypsend = Module._pq_begintypsend = wasmExports.pq_begintypsend)(e), _pq_endtypsend = Module._pq_endtypsend = (e) => (_pq_endtypsend = Module._pq_endtypsend = wasmExports.pq_endtypsend)(e), _pq_getmsgfloat4 = Module._pq_getmsgfloat4 = (e) => (_pq_getmsgfloat4 = Module._pq_getmsgfloat4 = wasmExports.pq_getmsgfloat4)(e), _pq_getmsgfloat8 = Module._pq_getmsgfloat8 = (e) => (_pq_getmsgfloat8 = Module._pq_getmsgfloat8 = wasmExports.pq_getmsgfloat8)(e), _pq_getmsgtext = Module._pq_getmsgtext = (e, t2, r) => (_pq_getmsgtext = Module._pq_getmsgtext = wasmExports.pq_getmsgtext)(e, t2, r), _pg_strtoint32 = Module._pg_strtoint32 = (e) => (_pg_strtoint32 = Module._pg_strtoint32 = wasmExports.pg_strtoint32)(e), _bms_membership = Module._bms_membership = (e) => (_bms_membership = Module._bms_membership = wasmExports.bms_membership)(e), _list_make5_impl = Module._list_make5_impl = (e, t2, r, a2, s4, o4) => (_list_make5_impl = Module._list_make5_impl = wasmExports.list_make5_impl)(e, t2, r, a2, s4, o4), _list_insert_nth = Module._list_insert_nth = (e, t2, r) => (_list_insert_nth = Module._list_insert_nth = wasmExports.list_insert_nth)(e, t2, r), _list_member_ptr = Module._list_member_ptr = (e, t2) => (_list_member_ptr = Module._list_member_ptr = wasmExports.list_member_ptr)(e, t2), _list_append_unique_ptr = Module._list_append_unique_ptr = (e, t2) => (_list_append_unique_ptr = Module._list_append_unique_ptr = wasmExports.list_append_unique_ptr)(e, t2), _make_opclause = Module._make_opclause = (e, t2, r, a2, s4, o4, n3) => (_make_opclause = Module._make_opclause = wasmExports.make_opclause)(e, t2, r, a2, s4, o4, n3), _exprIsLengthCoercion = Module._exprIsLengthCoercion = (e, t2) => (_exprIsLengthCoercion = Module._exprIsLengthCoercion = wasmExports.exprIsLengthCoercion)(e, t2), _fix_opfuncids = Module._fix_opfuncids = (e) => (_fix_opfuncids = Module._fix_opfuncids = wasmExports.fix_opfuncids)(e), _CleanQuerytext = Module._CleanQuerytext = (e, t2, r) => (_CleanQuerytext = Module._CleanQuerytext = wasmExports.CleanQuerytext)(e, t2, r), _EnableQueryId = Module._EnableQueryId = () => (_EnableQueryId = Module._EnableQueryId = wasmExports.EnableQueryId)(), _find_base_rel = Module._find_base_rel = (e, t2) => (_find_base_rel = Module._find_base_rel = wasmExports.find_base_rel)(e, t2), _add_path = Module._add_path = (e, t2) => (_add_path = Module._add_path = wasmExports.add_path)(e, t2), _pathkeys_contained_in = Module._pathkeys_contained_in = (e, t2) => (_pathkeys_contained_in = Module._pathkeys_contained_in = wasmExports.pathkeys_contained_in)(e, t2), _create_sort_path = Module._create_sort_path = (e, t2, r, a2, s4) => (_create_sort_path = Module._create_sort_path = wasmExports.create_sort_path)(e, t2, r, a2, s4), _set_baserel_size_estimates = Module._set_baserel_size_estimates = (e, t2) => (_set_baserel_size_estimates = Module._set_baserel_size_estimates = wasmExports.set_baserel_size_estimates)(e, t2), _clauselist_selectivity = Module._clauselist_selectivity = (e, t2, r, a2, s4) => (_clauselist_selectivity = Module._clauselist_selectivity = wasmExports.clauselist_selectivity)(e, t2, r, a2, s4), _get_tablespace_page_costs = Module._get_tablespace_page_costs = (e, t2, r) => (_get_tablespace_page_costs = Module._get_tablespace_page_costs = wasmExports.get_tablespace_page_costs)(e, t2, r), _cost_qual_eval = Module._cost_qual_eval = (e, t2, r) => (_cost_qual_eval = Module._cost_qual_eval = wasmExports.cost_qual_eval)(e, t2, r), _estimate_num_groups = Module._estimate_num_groups = (e, t2, r, a2, s4) => (_estimate_num_groups = Module._estimate_num_groups = wasmExports.estimate_num_groups)(e, t2, r, a2, s4), _cost_sort = Module._cost_sort = (e, t2, r, a2, s4, o4, n3, _3, l3) => (_cost_sort = Module._cost_sort = wasmExports.cost_sort)(e, t2, r, a2, s4, o4, n3, _3, l3), _get_sortgrouplist_exprs = Module._get_sortgrouplist_exprs = (e, t2) => (_get_sortgrouplist_exprs = Module._get_sortgrouplist_exprs = wasmExports.get_sortgrouplist_exprs)(e, t2), _make_restrictinfo = Module._make_restrictinfo = (e, t2, r, a2, s4, o4, n3, _3, l3, p4) => (_make_restrictinfo = Module._make_restrictinfo = wasmExports.make_restrictinfo)(e, t2, r, a2, s4, o4, n3, _3, l3, p4), _generate_implied_equalities_for_column = Module._generate_implied_equalities_for_column = (e, t2, r, a2, s4) => (_generate_implied_equalities_for_column = Module._generate_implied_equalities_for_column = wasmExports.generate_implied_equalities_for_column)(e, t2, r, a2, s4), _eclass_useful_for_merging = Module._eclass_useful_for_merging = (e, t2, r) => (_eclass_useful_for_merging = Module._eclass_useful_for_merging = wasmExports.eclass_useful_for_merging)(e, t2, r), _join_clause_is_movable_to = Module._join_clause_is_movable_to = (e, t2) => (_join_clause_is_movable_to = Module._join_clause_is_movable_to = wasmExports.join_clause_is_movable_to)(e, t2), _get_plan_rowmark = Module._get_plan_rowmark = (e, t2) => (_get_plan_rowmark = Module._get_plan_rowmark = wasmExports.get_plan_rowmark)(e, t2), _update_mergeclause_eclasses = Module._update_mergeclause_eclasses = (e, t2) => (_update_mergeclause_eclasses = Module._update_mergeclause_eclasses = wasmExports.update_mergeclause_eclasses)(e, t2), _find_join_rel = Module._find_join_rel = (e, t2) => (_find_join_rel = Module._find_join_rel = wasmExports.find_join_rel)(e, t2), _make_canonical_pathkey = Module._make_canonical_pathkey = (e, t2, r, a2, s4) => (_make_canonical_pathkey = Module._make_canonical_pathkey = wasmExports.make_canonical_pathkey)(e, t2, r, a2, s4), _get_sortgroupref_clause_noerr = Module._get_sortgroupref_clause_noerr = (e, t2) => (_get_sortgroupref_clause_noerr = Module._get_sortgroupref_clause_noerr = wasmExports.get_sortgroupref_clause_noerr)(e, t2), _extract_actual_clauses = Module._extract_actual_clauses = (e, t2) => (_extract_actual_clauses = Module._extract_actual_clauses = wasmExports.extract_actual_clauses)(e, t2), _change_plan_targetlist = Module._change_plan_targetlist = (e, t2, r) => (_change_plan_targetlist = Module._change_plan_targetlist = wasmExports.change_plan_targetlist)(e, t2, r), _make_foreignscan = Module._make_foreignscan = (e, t2, r, a2, s4, o4, n3, _3) => (_make_foreignscan = Module._make_foreignscan = wasmExports.make_foreignscan)(e, t2, r, a2, s4, o4, n3, _3), _tlist_member = Module._tlist_member = (e, t2) => (_tlist_member = Module._tlist_member = wasmExports.tlist_member)(e, t2), _pull_vars_of_level = Module._pull_vars_of_level = (e, t2) => (_pull_vars_of_level = Module._pull_vars_of_level = wasmExports.pull_vars_of_level)(e, t2), _IncrementVarSublevelsUp = Module._IncrementVarSublevelsUp = (e, t2, r) => (_IncrementVarSublevelsUp = Module._IncrementVarSublevelsUp = wasmExports.IncrementVarSublevelsUp)(e, t2, r), _standard_planner = Module._standard_planner = (e, t2, r, a2) => (_standard_planner = Module._standard_planner = wasmExports.standard_planner)(e, t2, r, a2), _get_relids_in_jointree = Module._get_relids_in_jointree = (e, t2, r) => (_get_relids_in_jointree = Module._get_relids_in_jointree = wasmExports.get_relids_in_jointree)(e, t2, r), _add_new_columns_to_pathtarget = Module._add_new_columns_to_pathtarget = (e, t2) => (_add_new_columns_to_pathtarget = Module._add_new_columns_to_pathtarget = wasmExports.add_new_columns_to_pathtarget)(e, t2), _get_agg_clause_costs = Module._get_agg_clause_costs = (e, t2, r) => (_get_agg_clause_costs = Module._get_agg_clause_costs = wasmExports.get_agg_clause_costs)(e, t2, r), _grouping_is_sortable = Module._grouping_is_sortable = (e) => (_grouping_is_sortable = Module._grouping_is_sortable = wasmExports.grouping_is_sortable)(e), _copy_pathtarget = Module._copy_pathtarget = (e) => (_copy_pathtarget = Module._copy_pathtarget = wasmExports.copy_pathtarget)(e), _create_projection_path = Module._create_projection_path = (e, t2, r, a2) => (_create_projection_path = Module._create_projection_path = wasmExports.create_projection_path)(e, t2, r, a2), _GetSysCacheHashValue = Module._GetSysCacheHashValue = (e, t2, r, a2, s4) => (_GetSysCacheHashValue = Module._GetSysCacheHashValue = wasmExports.GetSysCacheHashValue)(e, t2, r, a2, s4), _get_translated_update_targetlist = Module._get_translated_update_targetlist = (e, t2, r, a2) => (_get_translated_update_targetlist = Module._get_translated_update_targetlist = wasmExports.get_translated_update_targetlist)(e, t2, r, a2), _add_row_identity_var = Module._add_row_identity_var = (e, t2, r, a2) => (_add_row_identity_var = Module._add_row_identity_var = wasmExports.add_row_identity_var)(e, t2, r, a2), _get_rel_all_updated_cols = Module._get_rel_all_updated_cols = (e, t2) => (_get_rel_all_updated_cols = Module._get_rel_all_updated_cols = wasmExports.get_rel_all_updated_cols)(e, t2), _get_baserel_parampathinfo = Module._get_baserel_parampathinfo = (e, t2, r) => (_get_baserel_parampathinfo = Module._get_baserel_parampathinfo = wasmExports.get_baserel_parampathinfo)(e, t2, r), _create_foreignscan_path = Module._create_foreignscan_path = (e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4) => (_create_foreignscan_path = Module._create_foreignscan_path = wasmExports.create_foreignscan_path)(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4), _create_foreign_join_path = Module._create_foreign_join_path = (e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4) => (_create_foreign_join_path = Module._create_foreign_join_path = wasmExports.create_foreign_join_path)(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4), _create_foreign_upper_path = Module._create_foreign_upper_path = (e, t2, r, a2, s4, o4, n3, _3, l3, p4) => (_create_foreign_upper_path = Module._create_foreign_upper_path = wasmExports.create_foreign_upper_path)(e, t2, r, a2, s4, o4, n3, _3, l3, p4), _adjust_limit_rows_costs = Module._adjust_limit_rows_costs = (e, t2, r, a2, s4) => (_adjust_limit_rows_costs = Module._adjust_limit_rows_costs = wasmExports.adjust_limit_rows_costs)(e, t2, r, a2, s4), _add_to_flat_tlist = Module._add_to_flat_tlist = (e, t2) => (_add_to_flat_tlist = Module._add_to_flat_tlist = wasmExports.add_to_flat_tlist)(e, t2), _get_fn_expr_argtype = Module._get_fn_expr_argtype = (e, t2) => (_get_fn_expr_argtype = Module._get_fn_expr_argtype = wasmExports.get_fn_expr_argtype)(e, t2), _on_shmem_exit = Module._on_shmem_exit = (e, t2) => (_on_shmem_exit = Module._on_shmem_exit = wasmExports.on_shmem_exit)(e, t2), _SignalHandlerForConfigReload = Module._SignalHandlerForConfigReload = (e) => (_SignalHandlerForConfigReload = Module._SignalHandlerForConfigReload = wasmExports.SignalHandlerForConfigReload)(e), _SignalHandlerForShutdownRequest = Module._SignalHandlerForShutdownRequest = (e) => (_SignalHandlerForShutdownRequest = Module._SignalHandlerForShutdownRequest = wasmExports.SignalHandlerForShutdownRequest)(e), _procsignal_sigusr1_handler = Module._procsignal_sigusr1_handler = (e) => (_procsignal_sigusr1_handler = Module._procsignal_sigusr1_handler = wasmExports.procsignal_sigusr1_handler)(e), _RegisterBackgroundWorker = Module._RegisterBackgroundWorker = (e) => (_RegisterBackgroundWorker = Module._RegisterBackgroundWorker = wasmExports.RegisterBackgroundWorker)(e), _WaitForBackgroundWorkerStartup = Module._WaitForBackgroundWorkerStartup = (e, t2) => (_WaitForBackgroundWorkerStartup = Module._WaitForBackgroundWorkerStartup = wasmExports.WaitForBackgroundWorkerStartup)(e, t2), _GetConfigOption = Module._GetConfigOption = (e, t2, r) => (_GetConfigOption = Module._GetConfigOption = wasmExports.GetConfigOption)(e, t2, r), _toupper = Module._toupper = (e) => (_toupper = Module._toupper = wasmExports.toupper)(e), _pg_reg_getinitialstate = Module._pg_reg_getinitialstate = (e) => (_pg_reg_getinitialstate = Module._pg_reg_getinitialstate = wasmExports.pg_reg_getinitialstate)(e), _pg_reg_getfinalstate = Module._pg_reg_getfinalstate = (e) => (_pg_reg_getfinalstate = Module._pg_reg_getfinalstate = wasmExports.pg_reg_getfinalstate)(e), _pg_reg_getnumoutarcs = Module._pg_reg_getnumoutarcs = (e, t2) => (_pg_reg_getnumoutarcs = Module._pg_reg_getnumoutarcs = wasmExports.pg_reg_getnumoutarcs)(e, t2), _pg_reg_getoutarcs = Module._pg_reg_getoutarcs = (e, t2, r, a2) => (_pg_reg_getoutarcs = Module._pg_reg_getoutarcs = wasmExports.pg_reg_getoutarcs)(e, t2, r, a2), _pg_reg_getnumcolors = Module._pg_reg_getnumcolors = (e) => (_pg_reg_getnumcolors = Module._pg_reg_getnumcolors = wasmExports.pg_reg_getnumcolors)(e), _pg_reg_colorisbegin = Module._pg_reg_colorisbegin = (e, t2) => (_pg_reg_colorisbegin = Module._pg_reg_colorisbegin = wasmExports.pg_reg_colorisbegin)(e, t2), _pg_reg_colorisend = Module._pg_reg_colorisend = (e, t2) => (_pg_reg_colorisend = Module._pg_reg_colorisend = wasmExports.pg_reg_colorisend)(e, t2), _pg_reg_getnumcharacters = Module._pg_reg_getnumcharacters = (e, t2) => (_pg_reg_getnumcharacters = Module._pg_reg_getnumcharacters = wasmExports.pg_reg_getnumcharacters)(e, t2), _pg_reg_getcharacters = Module._pg_reg_getcharacters = (e, t2, r, a2) => (_pg_reg_getcharacters = Module._pg_reg_getcharacters = wasmExports.pg_reg_getcharacters)(e, t2, r, a2), _OutputPluginPrepareWrite = Module._OutputPluginPrepareWrite = (e, t2) => (_OutputPluginPrepareWrite = Module._OutputPluginPrepareWrite = wasmExports.OutputPluginPrepareWrite)(e, t2), _OutputPluginWrite = Module._OutputPluginWrite = (e, t2) => (_OutputPluginWrite = Module._OutputPluginWrite = wasmExports.OutputPluginWrite)(e, t2), _array_contains_nulls = Module._array_contains_nulls = (e) => (_array_contains_nulls = Module._array_contains_nulls = wasmExports.array_contains_nulls)(e), _hash_seq_term = Module._hash_seq_term = (e) => (_hash_seq_term = Module._hash_seq_term = wasmExports.hash_seq_term)(e), _FreeErrorData = Module._FreeErrorData = (e) => (_FreeErrorData = Module._FreeErrorData = wasmExports.FreeErrorData)(e), _RelidByRelfilenumber = Module._RelidByRelfilenumber = (e, t2) => (_RelidByRelfilenumber = Module._RelidByRelfilenumber = wasmExports.RelidByRelfilenumber)(e, t2), _WaitLatchOrSocket = Module._WaitLatchOrSocket = (e, t2, r, a2, s4) => (_WaitLatchOrSocket = Module._WaitLatchOrSocket = wasmExports.WaitLatchOrSocket)(e, t2, r, a2, s4), _get_row_security_policies = Module._get_row_security_policies = (e, t2, r, a2, s4, o4, n3) => (_get_row_security_policies = Module._get_row_security_policies = wasmExports.get_row_security_policies)(e, t2, r, a2, s4, o4, n3), _hash_estimate_size = Module._hash_estimate_size = (e, t2) => (_hash_estimate_size = Module._hash_estimate_size = wasmExports.hash_estimate_size)(e, t2), _ShmemInitHash = Module._ShmemInitHash = (e, t2, r, a2, s4) => (_ShmemInitHash = Module._ShmemInitHash = wasmExports.ShmemInitHash)(e, t2, r, a2, s4), _LockBufHdr = Module._LockBufHdr = (e) => (_LockBufHdr = Module._LockBufHdr = wasmExports.LockBufHdr)(e), _EvictUnpinnedBuffer = Module._EvictUnpinnedBuffer = (e) => (_EvictUnpinnedBuffer = Module._EvictUnpinnedBuffer = wasmExports.EvictUnpinnedBuffer)(e), _have_free_buffer = Module._have_free_buffer = () => (_have_free_buffer = Module._have_free_buffer = wasmExports.have_free_buffer)(), _copy_file = Module._copy_file = (e, t2) => (_copy_file = Module._copy_file = wasmExports.copy_file)(e, t2), _AcquireExternalFD = Module._AcquireExternalFD = () => (_AcquireExternalFD = Module._AcquireExternalFD = wasmExports.AcquireExternalFD)(), _GetNamedDSMSegment = Module._GetNamedDSMSegment = (e, t2, r, a2) => (_GetNamedDSMSegment = Module._GetNamedDSMSegment = wasmExports.GetNamedDSMSegment)(e, t2, r, a2), _RequestAddinShmemSpace = Module._RequestAddinShmemSpace = (e) => (_RequestAddinShmemSpace = Module._RequestAddinShmemSpace = wasmExports.RequestAddinShmemSpace)(e), _GetRunningTransactionData = Module._GetRunningTransactionData = () => (_GetRunningTransactionData = Module._GetRunningTransactionData = wasmExports.GetRunningTransactionData)(), _BackendXidGetPid = Module._BackendXidGetPid = (e) => (_BackendXidGetPid = Module._BackendXidGetPid = wasmExports.BackendXidGetPid)(e), _LWLockRegisterTranche = Module._LWLockRegisterTranche = (e, t2) => (_LWLockRegisterTranche = Module._LWLockRegisterTranche = wasmExports.LWLockRegisterTranche)(e, t2), _GetNamedLWLockTranche = Module._GetNamedLWLockTranche = (e) => (_GetNamedLWLockTranche = Module._GetNamedLWLockTranche = wasmExports.GetNamedLWLockTranche)(e), _LWLockNewTrancheId = Module._LWLockNewTrancheId = () => (_LWLockNewTrancheId = Module._LWLockNewTrancheId = wasmExports.LWLockNewTrancheId)(), _RequestNamedLWLockTranche = Module._RequestNamedLWLockTranche = (e, t2) => (_RequestNamedLWLockTranche = Module._RequestNamedLWLockTranche = wasmExports.RequestNamedLWLockTranche)(e, t2), _standard_ProcessUtility = Module._standard_ProcessUtility = (e, t2, r, a2, s4, o4, n3, _3) => (_standard_ProcessUtility = Module._standard_ProcessUtility = wasmExports.standard_ProcessUtility)(e, t2, r, a2, s4, o4, n3, _3), _lookup_ts_dictionary_cache = Module._lookup_ts_dictionary_cache = (e) => (_lookup_ts_dictionary_cache = Module._lookup_ts_dictionary_cache = wasmExports.lookup_ts_dictionary_cache)(e), _get_tsearch_config_filename = Module._get_tsearch_config_filename = (e, t2) => (_get_tsearch_config_filename = Module._get_tsearch_config_filename = wasmExports.get_tsearch_config_filename)(e, t2), _lowerstr = Module._lowerstr = (e) => (_lowerstr = Module._lowerstr = wasmExports.lowerstr)(e), _readstoplist = Module._readstoplist = (e, t2, r) => (_readstoplist = Module._readstoplist = wasmExports.readstoplist)(e, t2, r), _lowerstr_with_len = Module._lowerstr_with_len = (e, t2) => (_lowerstr_with_len = Module._lowerstr_with_len = wasmExports.lowerstr_with_len)(e, t2), _searchstoplist = Module._searchstoplist = (e, t2) => (_searchstoplist = Module._searchstoplist = wasmExports.searchstoplist)(e, t2), _tsearch_readline_begin = Module._tsearch_readline_begin = (e, t2) => (_tsearch_readline_begin = Module._tsearch_readline_begin = wasmExports.tsearch_readline_begin)(e, t2), _tsearch_readline = Module._tsearch_readline = (e) => (_tsearch_readline = Module._tsearch_readline = wasmExports.tsearch_readline)(e), _t_isspace = Module._t_isspace = (e) => (_t_isspace = Module._t_isspace = wasmExports.t_isspace)(e), _tsearch_readline_end = Module._tsearch_readline_end = (e) => (_tsearch_readline_end = Module._tsearch_readline_end = wasmExports.tsearch_readline_end)(e), _stringToQualifiedNameList = Module._stringToQualifiedNameList = (e, t2) => (_stringToQualifiedNameList = Module._stringToQualifiedNameList = wasmExports.stringToQualifiedNameList)(e, t2), _t_isdigit = Module._t_isdigit = (e) => (_t_isdigit = Module._t_isdigit = wasmExports.t_isdigit)(e), _t_isalnum = Module._t_isalnum = (e) => (_t_isalnum = Module._t_isalnum = wasmExports.t_isalnum)(e), _get_restriction_variable = Module._get_restriction_variable = (e, t2, r, a2, s4, o4) => (_get_restriction_variable = Module._get_restriction_variable = wasmExports.get_restriction_variable)(e, t2, r, a2, s4, o4), _MemoryContextAllocHuge = Module._MemoryContextAllocHuge = (e, t2) => (_MemoryContextAllocHuge = Module._MemoryContextAllocHuge = wasmExports.MemoryContextAllocHuge)(e, t2), _WaitEventExtensionNew = Module._WaitEventExtensionNew = (e) => (_WaitEventExtensionNew = Module._WaitEventExtensionNew = wasmExports.WaitEventExtensionNew)(e), _expand_array = Module._expand_array = (e, t2, r) => (_expand_array = Module._expand_array = wasmExports.expand_array)(e, t2, r), _arraycontsel = Module._arraycontsel = (e) => (_arraycontsel = Module._arraycontsel = wasmExports.arraycontsel)(e), _arraycontjoinsel = Module._arraycontjoinsel = (e) => (_arraycontjoinsel = Module._arraycontjoinsel = wasmExports.arraycontjoinsel)(e), _initArrayResult = Module._initArrayResult = (e, t2, r) => (_initArrayResult = Module._initArrayResult = wasmExports.initArrayResult)(e, t2, r), _array_create_iterator = Module._array_create_iterator = (e, t2, r) => (_array_create_iterator = Module._array_create_iterator = wasmExports.array_create_iterator)(e, t2, r), _array_iterate = Module._array_iterate = (e, t2, r) => (_array_iterate = Module._array_iterate = wasmExports.array_iterate)(e, t2, r), _ArrayGetIntegerTypmods = Module._ArrayGetIntegerTypmods = (e, t2) => (_ArrayGetIntegerTypmods = Module._ArrayGetIntegerTypmods = wasmExports.ArrayGetIntegerTypmods)(e, t2), _boolin = Module._boolin = (e) => (_boolin = Module._boolin = wasmExports.boolin)(e), _cash_cmp = Module._cash_cmp = (e) => (_cash_cmp = Module._cash_cmp = wasmExports.cash_cmp)(e), _int64_to_numeric = Module._int64_to_numeric = (e) => (_int64_to_numeric = Module._int64_to_numeric = wasmExports.int64_to_numeric)(e), _numeric_div = Module._numeric_div = (e) => (_numeric_div = Module._numeric_div = wasmExports.numeric_div)(e), _date_eq = Module._date_eq = (e) => (_date_eq = Module._date_eq = wasmExports.date_eq)(e), _date_lt = Module._date_lt = (e) => (_date_lt = Module._date_lt = wasmExports.date_lt)(e), _date_le = Module._date_le = (e) => (_date_le = Module._date_le = wasmExports.date_le)(e), _date_gt = Module._date_gt = (e) => (_date_gt = Module._date_gt = wasmExports.date_gt)(e), _date_ge = Module._date_ge = (e) => (_date_ge = Module._date_ge = wasmExports.date_ge)(e), _date_cmp = Module._date_cmp = (e) => (_date_cmp = Module._date_cmp = wasmExports.date_cmp)(e), _date_mi = Module._date_mi = (e) => (_date_mi = Module._date_mi = wasmExports.date_mi)(e), _time_eq = Module._time_eq = (e) => (_time_eq = Module._time_eq = wasmExports.time_eq)(e), _time_lt = Module._time_lt = (e) => (_time_lt = Module._time_lt = wasmExports.time_lt)(e), _time_le = Module._time_le = (e) => (_time_le = Module._time_le = wasmExports.time_le)(e), _time_gt = Module._time_gt = (e) => (_time_gt = Module._time_gt = wasmExports.time_gt)(e), _time_ge = Module._time_ge = (e) => (_time_ge = Module._time_ge = wasmExports.time_ge)(e), _time_cmp = Module._time_cmp = (e) => (_time_cmp = Module._time_cmp = wasmExports.time_cmp)(e), _time_mi_time = Module._time_mi_time = (e) => (_time_mi_time = Module._time_mi_time = wasmExports.time_mi_time)(e), _timetz_cmp = Module._timetz_cmp = (e) => (_timetz_cmp = Module._timetz_cmp = wasmExports.timetz_cmp)(e), _TransferExpandedObject = Module._TransferExpandedObject = (e, t2) => (_TransferExpandedObject = Module._TransferExpandedObject = wasmExports.TransferExpandedObject)(e, t2), _numeric_lt = Module._numeric_lt = (e) => (_numeric_lt = Module._numeric_lt = wasmExports.numeric_lt)(e), _numeric_ge = Module._numeric_ge = (e) => (_numeric_ge = Module._numeric_ge = wasmExports.numeric_ge)(e), _err_generic_string = Module._err_generic_string = (e, t2) => (_err_generic_string = Module._err_generic_string = wasmExports.err_generic_string)(e, t2), _domain_check = Module._domain_check = (e, t2, r, a2, s4) => (_domain_check = Module._domain_check = wasmExports.domain_check)(e, t2, r, a2, s4), _enum_lt = Module._enum_lt = (e) => (_enum_lt = Module._enum_lt = wasmExports.enum_lt)(e), _enum_le = Module._enum_le = (e) => (_enum_le = Module._enum_le = wasmExports.enum_le)(e), _enum_ge = Module._enum_ge = (e) => (_enum_ge = Module._enum_ge = wasmExports.enum_ge)(e), _enum_gt = Module._enum_gt = (e) => (_enum_gt = Module._enum_gt = wasmExports.enum_gt)(e), _enum_cmp = Module._enum_cmp = (e) => (_enum_cmp = Module._enum_cmp = wasmExports.enum_cmp)(e), _make_expanded_record_from_typeid = Module._make_expanded_record_from_typeid = (e, t2, r) => (_make_expanded_record_from_typeid = Module._make_expanded_record_from_typeid = wasmExports.make_expanded_record_from_typeid)(e, t2, r), _make_expanded_record_from_tupdesc = Module._make_expanded_record_from_tupdesc = (e, t2) => (_make_expanded_record_from_tupdesc = Module._make_expanded_record_from_tupdesc = wasmExports.make_expanded_record_from_tupdesc)(e, t2), _make_expanded_record_from_exprecord = Module._make_expanded_record_from_exprecord = (e, t2) => (_make_expanded_record_from_exprecord = Module._make_expanded_record_from_exprecord = wasmExports.make_expanded_record_from_exprecord)(e, t2), _expanded_record_set_tuple = Module._expanded_record_set_tuple = (e, t2, r, a2) => (_expanded_record_set_tuple = Module._expanded_record_set_tuple = wasmExports.expanded_record_set_tuple)(e, t2, r, a2), _expanded_record_get_tuple = Module._expanded_record_get_tuple = (e) => (_expanded_record_get_tuple = Module._expanded_record_get_tuple = wasmExports.expanded_record_get_tuple)(e), _deconstruct_expanded_record = Module._deconstruct_expanded_record = (e) => (_deconstruct_expanded_record = Module._deconstruct_expanded_record = wasmExports.deconstruct_expanded_record)(e), _expanded_record_lookup_field = Module._expanded_record_lookup_field = (e, t2, r) => (_expanded_record_lookup_field = Module._expanded_record_lookup_field = wasmExports.expanded_record_lookup_field)(e, t2, r), _expanded_record_set_field_internal = Module._expanded_record_set_field_internal = (e, t2, r, a2, s4, o4) => (_expanded_record_set_field_internal = Module._expanded_record_set_field_internal = wasmExports.expanded_record_set_field_internal)(e, t2, r, a2, s4, o4), _expanded_record_set_fields = Module._expanded_record_set_fields = (e, t2, r, a2) => (_expanded_record_set_fields = Module._expanded_record_set_fields = wasmExports.expanded_record_set_fields)(e, t2, r, a2), _float4in_internal = Module._float4in_internal = (e, t2, r, a2, s4) => (_float4in_internal = Module._float4in_internal = wasmExports.float4in_internal)(e, t2, r, a2, s4), _strtof = Module._strtof = (e, t2) => (_strtof = Module._strtof = wasmExports.strtof)(e, t2), _float8in_internal = Module._float8in_internal = (e, t2, r, a2, s4) => (_float8in_internal = Module._float8in_internal = wasmExports.float8in_internal)(e, t2, r, a2, s4), _float8out_internal = Module._float8out_internal = (e) => (_float8out_internal = Module._float8out_internal = wasmExports.float8out_internal)(e), _btfloat4cmp = Module._btfloat4cmp = (e) => (_btfloat4cmp = Module._btfloat4cmp = wasmExports.btfloat4cmp)(e), _btfloat8cmp = Module._btfloat8cmp = (e) => (_btfloat8cmp = Module._btfloat8cmp = wasmExports.btfloat8cmp)(e), _acos = Module._acos = (e) => (_acos = Module._acos = wasmExports.acos)(e), _asin = Module._asin = (e) => (_asin = Module._asin = wasmExports.asin)(e), _cos = Module._cos = (e) => (_cos = Module._cos = wasmExports.cos)(e), _str_tolower = Module._str_tolower = (e, t2, r) => (_str_tolower = Module._str_tolower = wasmExports.str_tolower)(e, t2, r), _pushJsonbValue = Module._pushJsonbValue = (e, t2, r) => (_pushJsonbValue = Module._pushJsonbValue = wasmExports.pushJsonbValue)(e, t2, r), _numeric_float4 = Module._numeric_float4 = (e) => (_numeric_float4 = Module._numeric_float4 = wasmExports.numeric_float4)(e), _numeric_cmp = Module._numeric_cmp = (e) => (_numeric_cmp = Module._numeric_cmp = wasmExports.numeric_cmp)(e), _numeric_eq = Module._numeric_eq = (e) => (_numeric_eq = Module._numeric_eq = wasmExports.numeric_eq)(e), _numeric_is_nan = Module._numeric_is_nan = (e) => (_numeric_is_nan = Module._numeric_is_nan = wasmExports.numeric_is_nan)(e), _timestamp_cmp = Module._timestamp_cmp = (e) => (_timestamp_cmp = Module._timestamp_cmp = wasmExports.timestamp_cmp)(e), _macaddr_cmp = Module._macaddr_cmp = (e) => (_macaddr_cmp = Module._macaddr_cmp = wasmExports.macaddr_cmp)(e), _macaddr_lt = Module._macaddr_lt = (e) => (_macaddr_lt = Module._macaddr_lt = wasmExports.macaddr_lt)(e), _macaddr_le = Module._macaddr_le = (e) => (_macaddr_le = Module._macaddr_le = wasmExports.macaddr_le)(e), _macaddr_eq = Module._macaddr_eq = (e) => (_macaddr_eq = Module._macaddr_eq = wasmExports.macaddr_eq)(e), _macaddr_ge = Module._macaddr_ge = (e) => (_macaddr_ge = Module._macaddr_ge = wasmExports.macaddr_ge)(e), _macaddr_gt = Module._macaddr_gt = (e) => (_macaddr_gt = Module._macaddr_gt = wasmExports.macaddr_gt)(e), _macaddr8_cmp = Module._macaddr8_cmp = (e) => (_macaddr8_cmp = Module._macaddr8_cmp = wasmExports.macaddr8_cmp)(e), _macaddr8_lt = Module._macaddr8_lt = (e) => (_macaddr8_lt = Module._macaddr8_lt = wasmExports.macaddr8_lt)(e), _macaddr8_le = Module._macaddr8_le = (e) => (_macaddr8_le = Module._macaddr8_le = wasmExports.macaddr8_le)(e), _macaddr8_eq = Module._macaddr8_eq = (e) => (_macaddr8_eq = Module._macaddr8_eq = wasmExports.macaddr8_eq)(e), _macaddr8_ge = Module._macaddr8_ge = (e) => (_macaddr8_ge = Module._macaddr8_ge = wasmExports.macaddr8_ge)(e), _macaddr8_gt = Module._macaddr8_gt = (e) => (_macaddr8_gt = Module._macaddr8_gt = wasmExports.macaddr8_gt)(e), _current_query = Module._current_query = (e) => (_current_query = Module._current_query = wasmExports.current_query)(e), _unpack_sql_state = Module._unpack_sql_state = (e) => (_unpack_sql_state = Module._unpack_sql_state = wasmExports.unpack_sql_state)(e), _get_fn_expr_rettype = Module._get_fn_expr_rettype = (e) => (_get_fn_expr_rettype = Module._get_fn_expr_rettype = wasmExports.get_fn_expr_rettype)(e), _btnamecmp = Module._btnamecmp = (e) => (_btnamecmp = Module._btnamecmp = wasmExports.btnamecmp)(e), _inet_in = Module._inet_in = (e) => (_inet_in = Module._inet_in = wasmExports.inet_in)(e), _network_cmp = Module._network_cmp = (e) => (_network_cmp = Module._network_cmp = wasmExports.network_cmp)(e), _convert_network_to_scalar = Module._convert_network_to_scalar = (e, t2, r) => (_convert_network_to_scalar = Module._convert_network_to_scalar = wasmExports.convert_network_to_scalar)(e, t2, r), _numeric_gt = Module._numeric_gt = (e) => (_numeric_gt = Module._numeric_gt = wasmExports.numeric_gt)(e), _numeric_le = Module._numeric_le = (e) => (_numeric_le = Module._numeric_le = wasmExports.numeric_le)(e), _numeric_float8_no_overflow = Module._numeric_float8_no_overflow = (e) => (_numeric_float8_no_overflow = Module._numeric_float8_no_overflow = wasmExports.numeric_float8_no_overflow)(e), _oidout = Module._oidout = (e) => (_oidout = Module._oidout = wasmExports.oidout)(e), _interval_mi = Module._interval_mi = (e) => (_interval_mi = Module._interval_mi = wasmExports.interval_mi)(e), _quote_ident = Module._quote_ident = (e) => (_quote_ident = Module._quote_ident = wasmExports.quote_ident)(e), _pg_wchar2mb_with_len = Module._pg_wchar2mb_with_len = (e, t2, r) => (_pg_wchar2mb_with_len = Module._pg_wchar2mb_with_len = wasmExports.pg_wchar2mb_with_len)(e, t2, r), _pg_get_indexdef_columns_extended = Module._pg_get_indexdef_columns_extended = (e, t2) => (_pg_get_indexdef_columns_extended = Module._pg_get_indexdef_columns_extended = wasmExports.pg_get_indexdef_columns_extended)(e, t2), _pg_get_querydef = Module._pg_get_querydef = (e, t2) => (_pg_get_querydef = Module._pg_get_querydef = wasmExports.pg_get_querydef)(e, t2), _strcspn = Module._strcspn = (e, t2) => (_strcspn = Module._strcspn = wasmExports.strcspn)(e, t2), _generic_restriction_selectivity = Module._generic_restriction_selectivity = (e, t2, r, a2, s4, o4) => (_generic_restriction_selectivity = Module._generic_restriction_selectivity = wasmExports.generic_restriction_selectivity)(e, t2, r, a2, s4, o4), _genericcostestimate = Module._genericcostestimate = (e, t2, r, a2) => (_genericcostestimate = Module._genericcostestimate = wasmExports.genericcostestimate)(e, t2, r, a2), _tidin = Module._tidin = (e) => (_tidin = Module._tidin = wasmExports.tidin)(e), _tidout = Module._tidout = (e) => (_tidout = Module._tidout = wasmExports.tidout)(e), _timestamp_in = Module._timestamp_in = (e) => (_timestamp_in = Module._timestamp_in = wasmExports.timestamp_in)(e), _timestamp_eq = Module._timestamp_eq = (e) => (_timestamp_eq = Module._timestamp_eq = wasmExports.timestamp_eq)(e), _timestamp_lt = Module._timestamp_lt = (e) => (_timestamp_lt = Module._timestamp_lt = wasmExports.timestamp_lt)(e), _timestamp_gt = Module._timestamp_gt = (e) => (_timestamp_gt = Module._timestamp_gt = wasmExports.timestamp_gt)(e), _timestamp_le = Module._timestamp_le = (e) => (_timestamp_le = Module._timestamp_le = wasmExports.timestamp_le)(e), _timestamp_ge = Module._timestamp_ge = (e) => (_timestamp_ge = Module._timestamp_ge = wasmExports.timestamp_ge)(e), _interval_eq = Module._interval_eq = (e) => (_interval_eq = Module._interval_eq = wasmExports.interval_eq)(e), _interval_lt = Module._interval_lt = (e) => (_interval_lt = Module._interval_lt = wasmExports.interval_lt)(e), _interval_gt = Module._interval_gt = (e) => (_interval_gt = Module._interval_gt = wasmExports.interval_gt)(e), _interval_le = Module._interval_le = (e) => (_interval_le = Module._interval_le = wasmExports.interval_le)(e), _interval_ge = Module._interval_ge = (e) => (_interval_ge = Module._interval_ge = wasmExports.interval_ge)(e), _interval_cmp = Module._interval_cmp = (e) => (_interval_cmp = Module._interval_cmp = wasmExports.interval_cmp)(e), _timestamp_mi = Module._timestamp_mi = (e) => (_timestamp_mi = Module._timestamp_mi = wasmExports.timestamp_mi)(e), _interval_um = Module._interval_um = (e) => (_interval_um = Module._interval_um = wasmExports.interval_um)(e), _has_fn_opclass_options = Module._has_fn_opclass_options = (e) => (_has_fn_opclass_options = Module._has_fn_opclass_options = wasmExports.has_fn_opclass_options)(e), _uuid_in = Module._uuid_in = (e) => (_uuid_in = Module._uuid_in = wasmExports.uuid_in)(e), _uuid_out = Module._uuid_out = (e) => (_uuid_out = Module._uuid_out = wasmExports.uuid_out)(e), _uuid_cmp = Module._uuid_cmp = (e) => (_uuid_cmp = Module._uuid_cmp = wasmExports.uuid_cmp)(e), _varbit_in = Module._varbit_in = (e) => (_varbit_in = Module._varbit_in = wasmExports.varbit_in)(e), _biteq = Module._biteq = (e) => (_biteq = Module._biteq = wasmExports.biteq)(e), _bitlt = Module._bitlt = (e) => (_bitlt = Module._bitlt = wasmExports.bitlt)(e), _bitle = Module._bitle = (e) => (_bitle = Module._bitle = wasmExports.bitle)(e), _bitgt = Module._bitgt = (e) => (_bitgt = Module._bitgt = wasmExports.bitgt)(e), _bitge = Module._bitge = (e) => (_bitge = Module._bitge = wasmExports.bitge)(e), _bitcmp = Module._bitcmp = (e) => (_bitcmp = Module._bitcmp = wasmExports.bitcmp)(e), _bpchareq = Module._bpchareq = (e) => (_bpchareq = Module._bpchareq = wasmExports.bpchareq)(e), _bpcharlt = Module._bpcharlt = (e) => (_bpcharlt = Module._bpcharlt = wasmExports.bpcharlt)(e), _bpcharle = Module._bpcharle = (e) => (_bpcharle = Module._bpcharle = wasmExports.bpcharle)(e), _bpchargt = Module._bpchargt = (e) => (_bpchargt = Module._bpchargt = wasmExports.bpchargt)(e), _bpcharge = Module._bpcharge = (e) => (_bpcharge = Module._bpcharge = wasmExports.bpcharge)(e), _bpcharcmp = Module._bpcharcmp = (e) => (_bpcharcmp = Module._bpcharcmp = wasmExports.bpcharcmp)(e), _texteq = Module._texteq = (e) => (_texteq = Module._texteq = wasmExports.texteq)(e), _text_lt = Module._text_lt = (e) => (_text_lt = Module._text_lt = wasmExports.text_lt)(e), _text_le = Module._text_le = (e) => (_text_le = Module._text_le = wasmExports.text_le)(e), _text_gt = Module._text_gt = (e) => (_text_gt = Module._text_gt = wasmExports.text_gt)(e), _text_ge = Module._text_ge = (e) => (_text_ge = Module._text_ge = wasmExports.text_ge)(e), _bttextcmp = Module._bttextcmp = (e) => (_bttextcmp = Module._bttextcmp = wasmExports.bttextcmp)(e), _byteaeq = Module._byteaeq = (e) => (_byteaeq = Module._byteaeq = wasmExports.byteaeq)(e), _bytealt = Module._bytealt = (e) => (_bytealt = Module._bytealt = wasmExports.bytealt)(e), _byteale = Module._byteale = (e) => (_byteale = Module._byteale = wasmExports.byteale)(e), _byteagt = Module._byteagt = (e) => (_byteagt = Module._byteagt = wasmExports.byteagt)(e), _byteage = Module._byteage = (e) => (_byteage = Module._byteage = wasmExports.byteage)(e), _byteacmp = Module._byteacmp = (e) => (_byteacmp = Module._byteacmp = wasmExports.byteacmp)(e), _to_hex32 = Module._to_hex32 = (e) => (_to_hex32 = Module._to_hex32 = wasmExports.to_hex32)(e), _varstr_levenshtein = Module._varstr_levenshtein = (e, t2, r, a2, s4, o4, n3, _3) => (_varstr_levenshtein = Module._varstr_levenshtein = wasmExports.varstr_levenshtein)(e, t2, r, a2, s4, o4, n3, _3), _pg_xml_init = Module._pg_xml_init = (e) => (_pg_xml_init = Module._pg_xml_init = wasmExports.pg_xml_init)(e), _xmlInitParser = Module._xmlInitParser = () => (_xmlInitParser = Module._xmlInitParser = wasmExports.xmlInitParser)(), _xml_ereport = Module._xml_ereport = (e, t2, r, a2) => (_xml_ereport = Module._xml_ereport = wasmExports.xml_ereport)(e, t2, r, a2), _pg_xml_done = Module._pg_xml_done = (e, t2) => (_pg_xml_done = Module._pg_xml_done = wasmExports.pg_xml_done)(e, t2), _xmlXPathNewContext = Module._xmlXPathNewContext = (e) => (_xmlXPathNewContext = Module._xmlXPathNewContext = wasmExports.xmlXPathNewContext)(e), _xmlXPathFreeContext = Module._xmlXPathFreeContext = (e) => (_xmlXPathFreeContext = Module._xmlXPathFreeContext = wasmExports.xmlXPathFreeContext)(e), _xmlFreeDoc = Module._xmlFreeDoc = (e) => (_xmlFreeDoc = Module._xmlFreeDoc = wasmExports.xmlFreeDoc)(e), _xmlXPathCtxtCompile = Module._xmlXPathCtxtCompile = (e, t2) => (_xmlXPathCtxtCompile = Module._xmlXPathCtxtCompile = wasmExports.xmlXPathCtxtCompile)(e, t2), _xmlXPathCompiledEval = Module._xmlXPathCompiledEval = (e, t2) => (_xmlXPathCompiledEval = Module._xmlXPathCompiledEval = wasmExports.xmlXPathCompiledEval)(e, t2), _xmlXPathFreeObject = Module._xmlXPathFreeObject = (e) => (_xmlXPathFreeObject = Module._xmlXPathFreeObject = wasmExports.xmlXPathFreeObject)(e), _xmlXPathFreeCompExpr = Module._xmlXPathFreeCompExpr = (e) => (_xmlXPathFreeCompExpr = Module._xmlXPathFreeCompExpr = wasmExports.xmlXPathFreeCompExpr)(e), _xmlStrdup = Module._xmlStrdup = (e) => (_xmlStrdup = Module._xmlStrdup = wasmExports.xmlStrdup)(e), _xmlEncodeSpecialChars = Module._xmlEncodeSpecialChars = (e, t2) => (_xmlEncodeSpecialChars = Module._xmlEncodeSpecialChars = wasmExports.xmlEncodeSpecialChars)(e, t2), _xmlStrlen = Module._xmlStrlen = (e) => (_xmlStrlen = Module._xmlStrlen = wasmExports.xmlStrlen)(e), _xmlBufferCreate = Module._xmlBufferCreate = () => (_xmlBufferCreate = Module._xmlBufferCreate = wasmExports.xmlBufferCreate)(), _xmlBufferFree = Module._xmlBufferFree = (e) => (_xmlBufferFree = Module._xmlBufferFree = wasmExports.xmlBufferFree)(e), _xmlXPathCastNodeToString = Module._xmlXPathCastNodeToString = (e) => (_xmlXPathCastNodeToString = Module._xmlXPathCastNodeToString = wasmExports.xmlXPathCastNodeToString)(e), _xmlNodeDump = Module._xmlNodeDump = (e, t2, r, a2, s4) => (_xmlNodeDump = Module._xmlNodeDump = wasmExports.xmlNodeDump)(e, t2, r, a2, s4), _get_typsubscript = Module._get_typsubscript = (e, t2) => (_get_typsubscript = Module._get_typsubscript = wasmExports.get_typsubscript)(e, t2), _CachedPlanAllowsSimpleValidityCheck = Module._CachedPlanAllowsSimpleValidityCheck = (e, t2, r) => (_CachedPlanAllowsSimpleValidityCheck = Module._CachedPlanAllowsSimpleValidityCheck = wasmExports.CachedPlanAllowsSimpleValidityCheck)(e, t2, r), _CachedPlanIsSimplyValid = Module._CachedPlanIsSimplyValid = (e, t2, r) => (_CachedPlanIsSimplyValid = Module._CachedPlanIsSimplyValid = wasmExports.CachedPlanIsSimplyValid)(e, t2, r), _GetCachedExpression = Module._GetCachedExpression = (e) => (_GetCachedExpression = Module._GetCachedExpression = wasmExports.GetCachedExpression)(e), _FreeCachedExpression = Module._FreeCachedExpression = (e) => (_FreeCachedExpression = Module._FreeCachedExpression = wasmExports.FreeCachedExpression)(e), _ReleaseAllPlanCacheRefsInOwner = Module._ReleaseAllPlanCacheRefsInOwner = (e) => (_ReleaseAllPlanCacheRefsInOwner = Module._ReleaseAllPlanCacheRefsInOwner = wasmExports.ReleaseAllPlanCacheRefsInOwner)(e), _in_error_recursion_trouble = Module._in_error_recursion_trouble = () => (_in_error_recursion_trouble = Module._in_error_recursion_trouble = wasmExports.in_error_recursion_trouble)(), _GetErrorContextStack = Module._GetErrorContextStack = () => (_GetErrorContextStack = Module._GetErrorContextStack = wasmExports.GetErrorContextStack)(), _find_rendezvous_variable = Module._find_rendezvous_variable = (e) => (_find_rendezvous_variable = Module._find_rendezvous_variable = wasmExports.find_rendezvous_variable)(e), _CallerFInfoFunctionCall2 = Module._CallerFInfoFunctionCall2 = (e, t2, r, a2, s4) => (_CallerFInfoFunctionCall2 = Module._CallerFInfoFunctionCall2 = wasmExports.CallerFInfoFunctionCall2)(e, t2, r, a2, s4), _FunctionCall0Coll = Module._FunctionCall0Coll = (e, t2) => (_FunctionCall0Coll = Module._FunctionCall0Coll = wasmExports.FunctionCall0Coll)(e, t2), _resolve_polymorphic_argtypes = Module._resolve_polymorphic_argtypes = (e, t2, r, a2) => (_resolve_polymorphic_argtypes = Module._resolve_polymorphic_argtypes = wasmExports.resolve_polymorphic_argtypes)(e, t2, r, a2), _pg_bindtextdomain = Module._pg_bindtextdomain = (e) => (_pg_bindtextdomain = Module._pg_bindtextdomain = wasmExports.pg_bindtextdomain)(e), _DefineCustomBoolVariable = Module._DefineCustomBoolVariable = (e, t2, r, a2, s4, o4, n3, _3, l3, p4) => (_DefineCustomBoolVariable = Module._DefineCustomBoolVariable = wasmExports.DefineCustomBoolVariable)(e, t2, r, a2, s4, o4, n3, _3, l3, p4), _DefineCustomIntVariable = Module._DefineCustomIntVariable = (e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2) => (_DefineCustomIntVariable = Module._DefineCustomIntVariable = wasmExports.DefineCustomIntVariable)(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2), _DefineCustomRealVariable = Module._DefineCustomRealVariable = (e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2) => (_DefineCustomRealVariable = Module._DefineCustomRealVariable = wasmExports.DefineCustomRealVariable)(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2), _DefineCustomStringVariable = Module._DefineCustomStringVariable = (e, t2, r, a2, s4, o4, n3, _3, l3, p4) => (_DefineCustomStringVariable = Module._DefineCustomStringVariable = wasmExports.DefineCustomStringVariable)(e, t2, r, a2, s4, o4, n3, _3, l3, p4), _DefineCustomEnumVariable = Module._DefineCustomEnumVariable = (e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4) => (_DefineCustomEnumVariable = Module._DefineCustomEnumVariable = wasmExports.DefineCustomEnumVariable)(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4), _MarkGUCPrefixReserved = Module._MarkGUCPrefixReserved = (e) => (_MarkGUCPrefixReserved = Module._MarkGUCPrefixReserved = wasmExports.MarkGUCPrefixReserved)(e), _sampler_random_init_state = Module._sampler_random_init_state = (e, t2) => (_sampler_random_init_state = Module._sampler_random_init_state = wasmExports.sampler_random_init_state)(e, t2), _pchomp = Module._pchomp = (e) => (_pchomp = Module._pchomp = wasmExports.pchomp)(e), _PinPortal = Module._PinPortal = (e) => (_PinPortal = Module._PinPortal = wasmExports.PinPortal)(e), _UnpinPortal = Module._UnpinPortal = (e) => (_UnpinPortal = Module._UnpinPortal = wasmExports.UnpinPortal)(e), _xmlBufferWriteCHAR = Module._xmlBufferWriteCHAR = (e, t2) => (_xmlBufferWriteCHAR = Module._xmlBufferWriteCHAR = wasmExports.xmlBufferWriteCHAR)(e, t2), _xmlBufferWriteChar = Module._xmlBufferWriteChar = (e, t2) => (_xmlBufferWriteChar = Module._xmlBufferWriteChar = wasmExports.xmlBufferWriteChar)(e, t2), _xmlReadMemory = Module._xmlReadMemory = (e, t2, r, a2, s4) => (_xmlReadMemory = Module._xmlReadMemory = wasmExports.xmlReadMemory)(e, t2, r, a2, s4), _xmlDocGetRootElement = Module._xmlDocGetRootElement = (e) => (_xmlDocGetRootElement = Module._xmlDocGetRootElement = wasmExports.xmlDocGetRootElement)(e), _xmlXPathIsNaN = Module._xmlXPathIsNaN = (e) => (_xmlXPathIsNaN = Module._xmlXPathIsNaN = wasmExports.xmlXPathIsNaN)(e), _xmlXPathCastToBoolean = Module._xmlXPathCastToBoolean = (e) => (_xmlXPathCastToBoolean = Module._xmlXPathCastToBoolean = wasmExports.xmlXPathCastToBoolean)(e), _xmlXPathCastToNumber = Module._xmlXPathCastToNumber = (e) => (_xmlXPathCastToNumber = Module._xmlXPathCastToNumber = wasmExports.xmlXPathCastToNumber)(e), ___dl_seterr = (e, t2) => (___dl_seterr = wasmExports.__dl_seterr)(e, t2), _gmtime = Module._gmtime = (e) => (_gmtime = Module._gmtime = wasmExports.gmtime)(e), _htonl = (e) => (_htonl = wasmExports.htonl)(e), _htons = (e) => (_htons = wasmExports.htons)(e), _ioctl = Module._ioctl = (e, t2, r) => (_ioctl = Module._ioctl = wasmExports.ioctl)(e, t2, r), _emscripten_builtin_memalign = (e, t2) => (_emscripten_builtin_memalign = wasmExports.emscripten_builtin_memalign)(e, t2), _ntohs = (e) => (_ntohs = wasmExports.ntohs)(e), _srand = Module._srand = (e) => (_srand = Module._srand = wasmExports.srand)(e), _rand = Module._rand = () => (_rand = Module._rand = wasmExports.rand)(), __emscripten_timeout = (e, t2) => (__emscripten_timeout = wasmExports._emscripten_timeout)(e, t2), _setThrew = (e, t2) => (_setThrew = wasmExports.setThrew)(e, t2), __emscripten_tempret_set = (e) => (__emscripten_tempret_set = wasmExports._emscripten_tempret_set)(e), __emscripten_tempret_get = () => (__emscripten_tempret_get = wasmExports._emscripten_tempret_get)(), __emscripten_stack_restore = (e) => (__emscripten_stack_restore = wasmExports._emscripten_stack_restore)(e), __emscripten_stack_alloc = (e) => (__emscripten_stack_alloc = wasmExports._emscripten_stack_alloc)(e), _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports.emscripten_stack_get_current)(), ___wasm_apply_data_relocs = () => (___wasm_apply_data_relocs = wasmExports.__wasm_apply_data_relocs)(), _InterruptPending = Module._InterruptPending = 2677872, _MyLatch = Module._MyLatch = 2678060, _CritSectionCount = Module._CritSectionCount = 2677924, _MyProc = Module._MyProc = 2647676, _pg_global_prng_state = Module._pg_global_prng_state = 2624256, _error_context_stack = Module._error_context_stack = 2676168, _GUC_check_errdetail_string = Module._GUC_check_errdetail_string = 2681820, _IsUnderPostmaster = Module._IsUnderPostmaster = 2677953, _CurrentMemoryContext = Module._CurrentMemoryContext = 2683248, _stdout = Module._stdout = 2537152, _debug_query_string = Module._debug_query_string = 2538700, _MyProcPort = Module._MyProcPort = 2678048, ___THREW__ = Module.___THREW__ = 2698916, ___threwValue = Module.___threwValue = 2698920, _MyDatabaseId = Module._MyDatabaseId = 2677932, _TopMemoryContext = Module._TopMemoryContext = 2683252, _PG_exception_stack = Module._PG_exception_stack = 2676172, _MyProcPid = Module._MyProcPid = 2678024, _stdin = Module._stdin = 2537e3, _ScanKeywords = Module._ScanKeywords = 2374040, _pg_number_of_ones = Module._pg_number_of_ones = 925120, _LocalBufferBlockPointers = Module._LocalBufferBlockPointers = 2644252, _BufferBlocks = Module._BufferBlocks = 2638988, _wal_level = Module._wal_level = 2387920, _SnapshotAnyData = Module._SnapshotAnyData = 2474096, _maintenance_work_mem = Module._maintenance_work_mem = 2421576, _ParallelWorkerNumber = Module._ParallelWorkerNumber = 2379480, _MainLWLockArray = Module._MainLWLockArray = 2645860, _CurrentResourceOwner = Module._CurrentResourceOwner = 2683296, _work_mem = Module._work_mem = 2421560, _NBuffers = Module._NBuffers = 2421584, _bsysscan = Module._bsysscan = 2625492, _CheckXidAlive = Module._CheckXidAlive = 2625488, _RecentXmin = Module._RecentXmin = 2474188, _XactIsoLevel = Module._XactIsoLevel = 2387784, _pgWalUsage = Module._pgWalUsage = 2628960, _pgBufferUsage = Module._pgBufferUsage = 2628832, _TTSOpsVirtual = Module._TTSOpsVirtual = 2391608, _TransamVariables = Module._TransamVariables = 2625480, _TopTransactionContext = Module._TopTransactionContext = 2683272, _RmgrTable = Module._RmgrTable = 2379504, _process_shared_preload_libraries_in_progress = Module._process_shared_preload_libraries_in_progress = 2681216, _wal_segment_size = Module._wal_segment_size = 2387940, _TopTransactionResourceOwner = Module._TopTransactionResourceOwner = 2683304, _arch_module_check_errdetail_string = Module._arch_module_check_errdetail_string = 2638372, _object_access_hook = Module._object_access_hook = 2627600, _InvalidObjectAddress = Module._InvalidObjectAddress = 1520620, _check_function_bodies = Module._check_function_bodies = 2421750, _post_parse_analyze_hook = Module._post_parse_analyze_hook = 2627640, _ScanKeywordTokens = Module._ScanKeywordTokens = 1551648, _SPI_processed = Module._SPI_processed = 2628984, _SPI_tuptable = Module._SPI_tuptable = 2628992, _TTSOpsMinimalTuple = Module._TTSOpsMinimalTuple = 2391712, _check_password_hook = Module._check_password_hook = 2627908, _ConfigReloadPending = Module._ConfigReloadPending = 2638360, _max_parallel_maintenance_workers = Module._max_parallel_maintenance_workers = 2421580, _DateStyle = Module._DateStyle = 2421548, _ExecutorStart_hook = Module._ExecutorStart_hook = 2628808, _ExecutorRun_hook = Module._ExecutorRun_hook = 2628812, _ExecutorFinish_hook = Module._ExecutorFinish_hook = 2628816, _ExecutorEnd_hook = Module._ExecutorEnd_hook = 2628820, _SPI_result = Module._SPI_result = 2628996, _ClientAuthentication_hook = Module._ClientAuthentication_hook = 2629168, _cpu_tuple_cost = Module._cpu_tuple_cost = 2392168, _cpu_operator_cost = Module._cpu_operator_cost = 2392184, _seq_page_cost = Module._seq_page_cost = 2392152, _planner_hook = Module._planner_hook = 2638056, _ShutdownRequestPending = Module._ShutdownRequestPending = 2638364, _MyStartTime = Module._MyStartTime = 2678032, _cluster_name = Module._cluster_name = 2421800, _application_name = Module._application_name = 2682044, _BufferDescriptors = Module._BufferDescriptors = 2638984, _shmem_startup_hook = Module._shmem_startup_hook = 2644932, _ProcessUtility_hook = Module._ProcessUtility_hook = 2647764, _IntervalStyle = Module._IntervalStyle = 2677956, _extra_float_digits = Module._extra_float_digits = 2411976, _pg_crc32_table = Module._pg_crc32_table = 2112288, _xmlFree = Module._xmlFree = 2523400, _shmem_request_hook = Module._shmem_request_hook = 2681220;
    function invoke_iii(e, t2, r) {
      var a2 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r);
      } catch (s4) {
        if (stackRestore(a2), s4 !== s4 + 0) throw s4;
        _setThrew(1, 0);
      }
    }
    function invoke_viiii(e, t2, r, a2, s4) {
      var o4 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4);
      } catch (n3) {
        if (stackRestore(o4), n3 !== n3 + 0) throw n3;
        _setThrew(1, 0);
      }
    }
    function invoke_vi(e, t2) {
      var r = stackSave();
      try {
        getWasmTableEntry(e)(t2);
      } catch (a2) {
        if (stackRestore(r), a2 !== a2 + 0) throw a2;
        _setThrew(1, 0);
      }
    }
    function invoke_v(e) {
      var t2 = stackSave();
      try {
        getWasmTableEntry(e)();
      } catch (r) {
        if (stackRestore(t2), r !== r + 0) throw r;
        _setThrew(1, 0);
      }
    }
    function invoke_j(e) {
      var t2 = stackSave();
      try {
        return getWasmTableEntry(e)();
      } catch (r) {
        if (stackRestore(t2), r !== r + 0) throw r;
        return _setThrew(1, 0), 0n;
      }
    }
    function invoke_viiiiii(e, t2, r, a2, s4, o4, n3) {
      var _3 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4, o4, n3);
      } catch (l3) {
        if (stackRestore(_3), l3 !== l3 + 0) throw l3;
        _setThrew(1, 0);
      }
    }
    function invoke_vii(e, t2, r) {
      var a2 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r);
      } catch (s4) {
        if (stackRestore(a2), s4 !== s4 + 0) throw s4;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiii(e, t2, r, a2, s4, o4) {
      var n3 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4);
      } catch (_3) {
        if (stackRestore(n3), _3 !== _3 + 0) throw _3;
        _setThrew(1, 0);
      }
    }
    function invoke_i(e) {
      var t2 = stackSave();
      try {
        return getWasmTableEntry(e)();
      } catch (r) {
        if (stackRestore(t2), r !== r + 0) throw r;
        _setThrew(1, 0);
      }
    }
    function invoke_ii(e, t2) {
      var r = stackSave();
      try {
        return getWasmTableEntry(e)(t2);
      } catch (a2) {
        if (stackRestore(r), a2 !== a2 + 0) throw a2;
        _setThrew(1, 0);
      }
    }
    function invoke_viii(e, t2, r, a2) {
      var s4 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2);
      } catch (o4) {
        if (stackRestore(s4), o4 !== o4 + 0) throw o4;
        _setThrew(1, 0);
      }
    }
    function invoke_vji(e, t2, r) {
      var a2 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r);
      } catch (s4) {
        if (stackRestore(a2), s4 !== s4 + 0) throw s4;
        _setThrew(1, 0);
      }
    }
    function invoke_iiii(e, t2, r, a2) {
      var s4 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2);
      } catch (o4) {
        if (stackRestore(s4), o4 !== o4 + 0) throw o4;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiiii(e, t2, r, a2, s4, o4, n3, _3) {
      var l3 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3);
      } catch (p4) {
        if (stackRestore(l3), p4 !== p4 + 0) throw p4;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiii(e, t2, r, a2, s4) {
      var o4 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4);
      } catch (n3) {
        if (stackRestore(o4), n3 !== n3 + 0) throw n3;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiiiiii(e, t2, r, a2, s4, o4, n3, _3, l3, p4) {
      var m4 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3, l3, p4);
      } catch (d2) {
        if (stackRestore(m4), d2 !== d2 + 0) throw d2;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiii(e, t2, r, a2, s4, o4) {
      var n3 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4, o4);
      } catch (_3) {
        if (stackRestore(n3), _3 !== _3 + 0) throw _3;
        _setThrew(1, 0);
      }
    }
    function invoke_jii(e, t2, r) {
      var a2 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r);
      } catch (s4) {
        if (stackRestore(a2), s4 !== s4 + 0) throw s4;
        return _setThrew(1, 0), 0n;
      }
    }
    function invoke_ji(e, t2) {
      var r = stackSave();
      try {
        return getWasmTableEntry(e)(t2);
      } catch (a2) {
        if (stackRestore(r), a2 !== a2 + 0) throw a2;
        return _setThrew(1, 0), 0n;
      }
    }
    function invoke_jiiiiiiiii(e, t2, r, a2, s4, o4, n3, _3, l3, p4) {
      var m4 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3, l3, p4);
      } catch (d2) {
        if (stackRestore(m4), d2 !== d2 + 0) throw d2;
        return _setThrew(1, 0), 0n;
      }
    }
    function invoke_jiiiiii(e, t2, r, a2, s4, o4, n3) {
      var _3 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3);
      } catch (l3) {
        if (stackRestore(_3), l3 !== l3 + 0) throw l3;
        return _setThrew(1, 0), 0n;
      }
    }
    function invoke_iiiiiiiiiiiiii(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2, g5, u2) {
      var f3 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2, g5, u2);
      } catch (c2) {
        if (stackRestore(f3), c2 !== c2 + 0) throw c2;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiijii(e, t2, r, a2, s4, o4, n3) {
      var _3 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3);
      } catch (l3) {
        if (stackRestore(_3), l3 !== l3 + 0) throw l3;
        _setThrew(1, 0);
      }
    }
    function invoke_vijiji(e, t2, r, a2, s4, o4) {
      var n3 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4, o4);
      } catch (_3) {
        if (stackRestore(n3), _3 !== _3 + 0) throw _3;
        _setThrew(1, 0);
      }
    }
    function invoke_viji(e, t2, r, a2) {
      var s4 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2);
      } catch (o4) {
        if (stackRestore(s4), o4 !== o4 + 0) throw o4;
        _setThrew(1, 0);
      }
    }
    function invoke_iiji(e, t2, r, a2) {
      var s4 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2);
      } catch (o4) {
        if (stackRestore(s4), o4 !== o4 + 0) throw o4;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiiiii(e, t2, r, a2, s4, o4, n3, _3, l3) {
      var p4 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3, l3);
      } catch (m4) {
        if (stackRestore(p4), m4 !== m4 + 0) throw m4;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiiiiiiiiiiiiii(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2, g5, u2, f3, c2, w4, x6) {
      var S3 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2, g5, u2, f3, c2, w4, x6);
      } catch (v3) {
        if (stackRestore(S3), v3 !== v3 + 0) throw v3;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiij(e, t2, r, a2, s4) {
      var o4 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4);
      } catch (n3) {
        if (stackRestore(o4), n3 !== n3 + 0) throw n3;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiii(e, t2, r, a2, s4, o4, n3) {
      var _3 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3);
      } catch (l3) {
        if (stackRestore(_3), l3 !== l3 + 0) throw l3;
        _setThrew(1, 0);
      }
    }
    function invoke_vj(e, t2) {
      var r = stackSave();
      try {
        getWasmTableEntry(e)(t2);
      } catch (a2) {
        if (stackRestore(r), a2 !== a2 + 0) throw a2;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiiiiii(e, t2, r, a2, s4, o4, n3, _3, l3, p4) {
      var m4 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3, l3, p4);
      } catch (d2) {
        if (stackRestore(m4), d2 !== d2 + 0) throw d2;
        _setThrew(1, 0);
      }
    }
    function invoke_viiji(e, t2, r, a2, s4) {
      var o4 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4);
      } catch (n3) {
        if (stackRestore(o4), n3 !== n3 + 0) throw n3;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiiiii(e, t2, r, a2, s4, o4, n3, _3, l3) {
      var p4 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3, l3);
      } catch (m4) {
        if (stackRestore(p4), m4 !== m4 + 0) throw m4;
        _setThrew(1, 0);
      }
    }
    function invoke_vij(e, t2, r) {
      var a2 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r);
      } catch (s4) {
        if (stackRestore(a2), s4 !== s4 + 0) throw s4;
        _setThrew(1, 0);
      }
    }
    function invoke_ij(e, t2) {
      var r = stackSave();
      try {
        return getWasmTableEntry(e)(t2);
      } catch (a2) {
        if (stackRestore(r), a2 !== a2 + 0) throw a2;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiiiii(e, t2, r, a2, s4, o4, n3, _3) {
      var l3 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3);
      } catch (p4) {
        if (stackRestore(l3), p4 !== p4 + 0) throw p4;
        _setThrew(1, 0);
      }
    }
    function invoke_viiiji(e, t2, r, a2, s4, o4) {
      var n3 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4, o4);
      } catch (_3) {
        if (stackRestore(n3), _3 !== _3 + 0) throw _3;
        _setThrew(1, 0);
      }
    }
    function invoke_iiij(e, t2, r, a2) {
      var s4 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2);
      } catch (o4) {
        if (stackRestore(s4), o4 !== o4 + 0) throw o4;
        _setThrew(1, 0);
      }
    }
    function invoke_vid(e, t2, r) {
      var a2 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r);
      } catch (s4) {
        if (stackRestore(a2), s4 !== s4 + 0) throw s4;
        _setThrew(1, 0);
      }
    }
    function invoke_ijiiiiii(e, t2, r, a2, s4, o4, n3, _3) {
      var l3 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3);
      } catch (p4) {
        if (stackRestore(l3), p4 !== p4 + 0) throw p4;
        _setThrew(1, 0);
      }
    }
    function invoke_viijii(e, t2, r, a2, s4, o4) {
      var n3 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4, o4);
      } catch (_3) {
        if (stackRestore(n3), _3 !== _3 + 0) throw _3;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiji(e, t2, r, a2, s4, o4, n3) {
      var _3 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3);
      } catch (l3) {
        if (stackRestore(_3), l3 !== l3 + 0) throw l3;
        _setThrew(1, 0);
      }
    }
    function invoke_viijiiii(e, t2, r, a2, s4, o4, n3, _3) {
      var l3 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3);
      } catch (p4) {
        if (stackRestore(l3), p4 !== p4 + 0) throw p4;
        _setThrew(1, 0);
      }
    }
    function invoke_viij(e, t2, r, a2) {
      var s4 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2);
      } catch (o4) {
        if (stackRestore(s4), o4 !== o4 + 0) throw o4;
        _setThrew(1, 0);
      }
    }
    function invoke_jiiii(e, t2, r, a2, s4) {
      var o4 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4);
      } catch (n3) {
        if (stackRestore(o4), n3 !== n3 + 0) throw n3;
        return _setThrew(1, 0), 0n;
      }
    }
    function invoke_viiiiiiiiiiii(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2, g5) {
      var u2 = stackSave();
      try {
        getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3, l3, p4, m4, d2, g5);
      } catch (f3) {
        if (stackRestore(u2), f3 !== f3 + 0) throw f3;
        _setThrew(1, 0);
      }
    }
    function invoke_di(e, t2) {
      var r = stackSave();
      try {
        return getWasmTableEntry(e)(t2);
      } catch (a2) {
        if (stackRestore(r), a2 !== a2 + 0) throw a2;
        _setThrew(1, 0);
      }
    }
    function invoke_id(e, t2) {
      var r = stackSave();
      try {
        return getWasmTableEntry(e)(t2);
      } catch (a2) {
        if (stackRestore(r), a2 !== a2 + 0) throw a2;
        _setThrew(1, 0);
      }
    }
    function invoke_ijiiiii(e, t2, r, a2, s4, o4, n3) {
      var _3 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3);
      } catch (l3) {
        if (stackRestore(_3), l3 !== l3 + 0) throw l3;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiiiiiii(e, t2, r, a2, s4, o4, n3, _3, l3, p4, m4) {
      var d2 = stackSave();
      try {
        return getWasmTableEntry(e)(t2, r, a2, s4, o4, n3, _3, l3, p4, m4);
      } catch (g5) {
        if (stackRestore(d2), g5 !== g5 + 0) throw g5;
        _setThrew(1, 0);
      }
    }
    Module.addRunDependency = addRunDependency, Module.removeRunDependency = removeRunDependency, Module.addFunction = addFunction, Module.removeFunction = removeFunction, Module.setValue = setValue, Module.getValue = getValue, Module.UTF8ToString = UTF8ToString, Module.stringToNewUTF8 = stringToNewUTF8, Module.stringToUTF8OnStack = stringToUTF8OnStack, Module.FS_createPreloadedFile = FS_createPreloadedFile, Module.FS_unlink = FS_unlink, Module.FS_createPath = FS_createPath, Module.FS_createDevice = FS_createDevice, Module.FS = FS, Module.FS_createDataFile = FS_createDataFile, Module.FS_createLazyFile = FS_createLazyFile, Module.MEMFS = MEMFS, Module.IDBFS = IDBFS;
    var calledRun;
    dependenciesFulfilled = function e() {
      calledRun || run(), calledRun || (dependenciesFulfilled = e);
    };
    function callMain(e = []) {
      var t2 = resolveGlobalSymbol("main").sym;
      if (t2) {
        e.unshift(thisProgram);
        var r = e.length, a2 = stackAlloc((r + 1) * 4), s4 = a2;
        e.forEach((n3) => {
          HEAPU32[s4 >> 2] = stringToUTF8OnStack(n3), s4 += 4;
        }), HEAPU32[s4 >> 2] = 0;
        try {
          var o4 = t2(r, a2);
          return exitJS(o4, true), o4;
        } catch (n3) {
          return handleException(n3);
        }
      }
    }
    function run(e = arguments_) {
      if (runDependencies > 0 || (preRun(), runDependencies > 0)) return;
      function t2() {
        calledRun || (calledRun = true, Module.calledRun = true, !ABORT && (initRuntime(), preMain(), readyPromiseResolve(Module), Module.onRuntimeInitialized?.(), shouldRunNow && callMain(e), postRun()));
      }
      Module.setStatus ? (Module.setStatus("Running..."), setTimeout(() => {
        setTimeout(() => Module.setStatus(""), 1), t2();
      }, 1)) : t2();
    }
    if (Module.preInit) for (typeof Module.preInit == "function" && (Module.preInit = [Module.preInit]); Module.preInit.length > 0; ) Module.preInit.pop()();
    var shouldRunNow = true;
    return Module.noInitialRun && (shouldRunNow = false), run(), moduleRtn = readyPromise, moduleRtn;
  };
})();
var He2 = pt2;
var je2 = He2;
var ne2;
var te2;
var re2;
var ie;
var _e2;
var xe2;
var we2;
var Se2;
var ye2;
var le2;
var fe2;
var he2;
var pe2;
var ae;
var $3;
var I2;
var se2;
var de2;
var B;
var Q2;
var K2;
var me2;
var oe;
var J2;
var O4;
var Z2;
var q2;
var G3;
var C4;
var Ve2;
var Xe2;
var ge2;
var Ke2;
var Ye2;
var L5 = class L6 extends k2 {
  constructor(r = {}, a2 = {}) {
    super();
    R(this, C4);
    R(this, ne2, false);
    R(this, te2, false);
    R(this, re2, false);
    R(this, ie, false);
    R(this, _e2, false);
    R(this, xe2, new Y2());
    R(this, we2, new Y2());
    R(this, Se2, new Y2());
    R(this, ye2, new Y2());
    R(this, le2, false);
    this.debug = 0;
    R(this, fe2);
    R(this, he2, []);
    R(this, pe2, new ye());
    R(this, ae);
    R(this, $3);
    R(this, I2, /* @__PURE__ */ new Map());
    R(this, se2, /* @__PURE__ */ new Set());
    R(this, de2, -1);
    R(this, B, []);
    R(this, Q2, false);
    R(this, K2);
    R(this, me2, -1);
    R(this, oe, []);
    R(this, J2, 0);
    R(this, O4, null);
    R(this, Z2, true);
    R(this, q2, new Uint8Array(0));
    R(this, G3, 0);
    typeof r == "string" ? a2 = { dataDir: r, ...a2 } : a2 = r, this.dataDir = a2.dataDir, a2.parsers !== void 0 && (this.parsers = { ...this.parsers, ...a2.parsers }), a2.serializers !== void 0 && (this.serializers = { ...this.serializers, ...a2.serializers }), a2?.debug !== void 0 && (this.debug = a2.debug), a2?.relaxedDurability !== void 0 && x(this, _e2, a2.relaxedDurability), x(this, fe2, a2.extensions ?? {}), this.waitReady = T(this, C4, Ve2).call(this, a2 ?? {});
  }
  static async create(r, a2) {
    let s4 = typeof r == "string" ? { dataDir: r, ...a2 ?? {} } : r ?? {}, o4 = new L6(s4);
    return await o4.waitReady, o4;
  }
  get Module() {
    return this.mod;
  }
  get ready() {
    return h(this, ne2) && !h(this, te2) && !h(this, re2);
  }
  get closed() {
    return h(this, re2);
  }
  async close() {
    await this._checkReady(), x(this, te2, true);
    for (let r of h(this, he2)) await r();
    try {
      await this.execProtocol(k.end()), this.mod._pgl_shutdown(), this.mod.removeFunction(h(this, me2)), this.mod.removeFunction(h(this, de2));
    } catch (r) {
      let a2 = r;
      if (!(a2.name === "ExitStatus" && a2.status === 0)) throw r;
    }
    await this.fs.closeFs(), x(this, re2, true), x(this, te2, false);
  }
  async [Symbol.asyncDispose]() {
    await this.close();
  }
  async _handleBlob(r) {
    x(this, ae, r ? await r.arrayBuffer() : void 0);
  }
  async _cleanupBlob() {
    x(this, ae, void 0);
  }
  async _getWrittenBlob() {
    if (!h(this, $3)) return;
    let r = new Blob(h(this, $3));
    return x(this, $3, void 0), r;
  }
  async _checkReady() {
    if (h(this, te2)) throw new Error("PGlite is closing");
    if (h(this, re2)) throw new Error("PGlite is closed");
    h(this, ne2) || await this.waitReady;
  }
  execProtocolRawSync(r) {
    let a2 = this.mod;
    return x(this, J2, 0), x(this, G3, 0), x(this, oe, r), h(this, Z2) && h(this, q2).length !== L6.DEFAULT_RECV_BUF_SIZE && x(this, q2, new Uint8Array(L6.DEFAULT_RECV_BUF_SIZE)), a2._interactive_one(r.length, r[0]), x(this, oe, []), h(this, Z2) && h(this, G3) ? h(this, q2).subarray(0, h(this, G3)) : new Uint8Array(0);
  }
  async execProtocolRaw(r, { syncToFs: a2 = true } = {}) {
    let s4 = this.execProtocolRawSync(r);
    return a2 && await this.syncToFs(), s4;
  }
  async execProtocol(r, { syncToFs: a2 = true, throwOnError: s4 = true, onNotice: o4 } = {}) {
    x(this, Q2, s4), x(this, K2, o4), x(this, B, []), x(this, O4, null);
    let n3 = await this.execProtocolRaw(r, { syncToFs: a2 }), _3 = h(this, O4);
    x(this, Q2, false), x(this, K2, void 0), x(this, O4, null);
    let l3 = { messages: h(this, B), data: n3 };
    if (x(this, B, []), s4 && _3) throw x(this, pe2, new ye()), _3;
    return l3;
  }
  async execProtocolStream(r, { syncToFs: a2, throwOnError: s4 = true, onNotice: o4 } = {}) {
    x(this, Q2, s4), x(this, K2, o4), x(this, B, []), x(this, O4, null), x(this, Z2, false), await this.execProtocolRaw(r, { syncToFs: a2 }), x(this, Z2, true);
    let n3 = h(this, O4);
    x(this, Q2, false), x(this, K2, void 0), x(this, O4, null);
    let _3 = h(this, B);
    if (x(this, B, []), s4 && n3) throw x(this, pe2, new ye()), n3;
    return _3;
  }
  isInTransaction() {
    return h(this, ie);
  }
  async syncToFs() {
    if (h(this, le2)) return;
    x(this, le2, true);
    let r = async () => {
      await h(this, ye2).runExclusive(async () => {
        x(this, le2, false), await this.fs.syncToFs(h(this, _e2));
      });
    };
    h(this, _e2) ? r() : await r();
  }
  async listen(r, a2, s4) {
    return this._runExclusiveListen(() => T(this, C4, Ke2).call(this, r, a2, s4));
  }
  async unlisten(r, a2, s4) {
    return this._runExclusiveListen(() => T(this, C4, Ye2).call(this, r, a2, s4));
  }
  onNotification(r) {
    return h(this, se2).add(r), () => {
      h(this, se2).delete(r);
    };
  }
  offNotification(r) {
    h(this, se2).delete(r);
  }
  async dumpDataDir(r) {
    await this._checkReady();
    let a2 = this.dataDir?.split("/").pop() ?? "pgdata";
    return this.fs.dumpTar(a2, r);
  }
  _runExclusiveQuery(r) {
    return h(this, xe2).runExclusive(r);
  }
  _runExclusiveTransaction(r) {
    return h(this, we2).runExclusive(r);
  }
  async clone() {
    let r = await this.dumpDataDir("none");
    return L6.create({ loadDataDir: r });
  }
  _runExclusiveListen(r) {
    return h(this, Se2).runExclusive(r);
  }
};
ne2 = /* @__PURE__ */ new WeakMap(), te2 = /* @__PURE__ */ new WeakMap(), re2 = /* @__PURE__ */ new WeakMap(), ie = /* @__PURE__ */ new WeakMap(), _e2 = /* @__PURE__ */ new WeakMap(), xe2 = /* @__PURE__ */ new WeakMap(), we2 = /* @__PURE__ */ new WeakMap(), Se2 = /* @__PURE__ */ new WeakMap(), ye2 = /* @__PURE__ */ new WeakMap(), le2 = /* @__PURE__ */ new WeakMap(), fe2 = /* @__PURE__ */ new WeakMap(), he2 = /* @__PURE__ */ new WeakMap(), pe2 = /* @__PURE__ */ new WeakMap(), ae = /* @__PURE__ */ new WeakMap(), $3 = /* @__PURE__ */ new WeakMap(), I2 = /* @__PURE__ */ new WeakMap(), se2 = /* @__PURE__ */ new WeakMap(), de2 = /* @__PURE__ */ new WeakMap(), B = /* @__PURE__ */ new WeakMap(), Q2 = /* @__PURE__ */ new WeakMap(), K2 = /* @__PURE__ */ new WeakMap(), me2 = /* @__PURE__ */ new WeakMap(), oe = /* @__PURE__ */ new WeakMap(), J2 = /* @__PURE__ */ new WeakMap(), O4 = /* @__PURE__ */ new WeakMap(), Z2 = /* @__PURE__ */ new WeakMap(), q2 = /* @__PURE__ */ new WeakMap(), G3 = /* @__PURE__ */ new WeakMap(), C4 = /* @__PURE__ */ new WeakSet(), Ve2 = async function(r) {
  if (r.fs) this.fs = r.fs;
  else {
    let { dataDir: d2, fsType: g5 } = Ge2(r.dataDir);
    this.fs = await Ue2(d2, g5);
  }
  let a2 = {}, s4 = [], o4 = [`PGDATA=${C2}`, `PREFIX=${Vr}`, `PGUSER=${r.username ?? "postgres"}`, `PGDATABASE=${r.database ?? "template1"}`, "MODE=REACT", "REPL=N", ...this.debug ? ["-d", this.debug.toString()] : []];
  r.wasmModule || Rr();
  let n3 = r.fsBundle ? r.fsBundle.arrayBuffer() : Er(), _3;
  n3.then((d2) => {
    _3 = d2;
  });
  let l3 = { WASM_PREFIX: Vr, arguments: o4, INITIAL_MEMORY: r.initialMemory, noExitRuntime: true, ...this.debug > 0 ? { print: console.info, printErr: console.error } : { print: () => {
  }, printErr: () => {
  } }, instantiateWasm: (d2, g5) => (Tr(d2, r.wasmModule).then(({ instance: u2, module: f3 }) => {
    g5(u2, f3);
  }), {}), getPreloadedPackage: (d2, g5) => {
    if (d2 === "pglite.data") {
      if (_3.byteLength !== g5) throw new Error(`Invalid FS bundle size: ${_3.byteLength} !== ${g5}`);
      return _3;
    }
    throw new Error(`Unknown package: ${d2}`);
  }, preRun: [(d2) => {
    let g5 = d2.FS.makedev(64, 0), u2 = { open: (f3) => {
    }, close: (f3) => {
    }, read: (f3, c2, w4, x6, S3) => {
      let v3 = h(this, ae);
      if (!v3) throw new Error("No /dev/blob File or Blob provided to read from");
      let b3 = new Uint8Array(v3);
      if (S3 >= b3.length) return 0;
      let E2 = Math.min(b3.length - S3, x6);
      for (let y4 = 0; y4 < E2; y4++) c2[w4 + y4] = b3[S3 + y4];
      return E2;
    }, write: (f3, c2, w4, x6, S3) => (h(this, $3) ?? x(this, $3, []), h(this, $3).push(c2.slice(w4, w4 + x6)), x6), llseek: (f3, c2, w4) => {
      let x6 = h(this, ae);
      if (!x6) throw new Error("No /dev/blob File or Blob provided to llseek");
      let S3 = c2;
      if (w4 === 1 ? S3 += f3.position : w4 === 2 && (S3 = new Uint8Array(x6).length), S3 < 0) throw new d2.FS.ErrnoError(28);
      return S3;
    } };
    d2.FS.registerDevice(g5, u2), d2.FS.mkdev("/dev/blob", g5);
  }] }, { emscriptenOpts: p4 } = await this.fs.init(this, l3);
  l3 = p4;
  for (let [d2, g5] of Object.entries(h(this, fe2))) if (g5 instanceof URL) a2[d2] = ke2(g5);
  else {
    let u2 = await g5.setup(this, l3);
    if (u2.emscriptenOpts && (l3 = u2.emscriptenOpts), u2.namespaceObj) {
      let f3 = this;
      f3[d2] = u2.namespaceObj;
    }
    u2.bundlePath && (a2[d2] = ke2(u2.bundlePath)), u2.init && s4.push(u2.init), u2.close && h(this, he2).push(u2.close);
  }
  if (l3.pg_extensions = a2, await n3, this.mod = await je2(l3), x(this, de2, this.mod.addFunction((d2, g5) => {
    let u2;
    try {
      u2 = this.mod.HEAPU8.subarray(d2, d2 + g5);
    } catch (f3) {
      throw console.error("error", f3), f3;
    }
    if (h(this, pe2).parse(u2, (f3) => {
      T(this, C4, Xe2).call(this, f3);
    }), h(this, Z2)) {
      let f3 = u2.slice(), c2 = h(this, G3) + f3.length;
      if (c2 > h(this, q2).length) {
        let w4 = h(this, q2).length + (h(this, q2).length >> 1) + c2;
        c2 > L5.MAX_BUFFER_SIZE && (c2 = L5.MAX_BUFFER_SIZE);
        let x6 = new Uint8Array(w4);
        x6.set(h(this, q2).subarray(0, h(this, G3))), x(this, q2, x6);
      }
      return h(this, q2).set(f3, h(this, G3)), x(this, G3, h(this, G3) + f3.length), h(this, q2).length;
    }
    return g5;
  }, "iii")), x(this, me2, this.mod.addFunction((d2, g5) => {
    let u2 = h(this, oe).length - h(this, J2);
    u2 > g5 && (u2 = g5);
    try {
      this.mod.HEAP8.set(h(this, oe).subarray(h(this, J2), h(this, J2) + u2), d2), x(this, J2, h(this, J2) + u2);
    } catch (f3) {
      console.log(f3);
    }
    return u2;
  }, "iii")), this.mod._set_read_write_cbs(h(this, me2), h(this, de2)), await this.fs.initialSyncFs(), r.loadDataDir) {
    if (this.mod.FS.analyzePath(C2 + "/PG_VERSION").exists) throw new Error("Database already exists, cannot load from tarball");
    T(this, C4, ge2).call(this, "pglite: loading data from tarball"), await ce2(this.mod.FS, r.loadDataDir, C2);
  }
  this.mod.FS.analyzePath(C2 + "/PG_VERSION").exists ? T(this, C4, ge2).call(this, "pglite: found DB, resuming") : T(this, C4, ge2).call(this, "pglite: no db"), await Be2(this.mod, (...d2) => T(this, C4, ge2).call(this, ...d2));
  let m4 = this.mod._pgl_initdb();
  if (!m4) throw new Error("INITDB failed to return value");
  if (m4 & 1) throw new Error("INITDB: failed to execute");
  if (m4 & 2) {
    let d2 = r.username ?? "postgres", g5 = r.database ?? "template1";
    if (m4 & 4) {
      if (!(m4 & 12)) throw new Error(`INITDB: Invalid db ${g5}/user ${d2} combination`);
    } else if (g5 !== "template1" && d2 !== "postgres") throw new Error(`INITDB: created a new datadir ${C2}, but an alternative db ${g5}/user ${d2} was requested`);
  }
  this.mod._pgl_backend(), await this.syncToFs(), x(this, ne2, true), await this.exec("SET search_path TO public;"), await this._initArrayTypes();
  for (let d2 of s4) await d2();
}, Xe2 = function(r) {
  if (!h(this, O4)) {
    if (r instanceof C) h(this, Q2) && x(this, O4, r);
    else if (r instanceof te) this.debug > 0 && console.warn(r), h(this, K2) && h(this, K2).call(this, r);
    else if (r instanceof Z) switch (r.text) {
      case "BEGIN":
        x(this, ie, true);
        break;
      case "COMMIT":
      case "ROLLBACK":
        x(this, ie, false);
        break;
    }
    else if (r instanceof J) {
      let a2 = h(this, I2).get(r.channel);
      a2 && a2.forEach((s4) => {
        queueMicrotask(() => s4(r.payload));
      }), h(this, se2).forEach((s4) => {
        queueMicrotask(() => s4(r.channel, r.payload));
      });
    }
    h(this, B).push(r);
  }
}, ge2 = function(...r) {
  this.debug > 0 && console.log(...r);
}, Ke2 = async function(r, a2, s4) {
  let o4 = Nr(r), n3 = s4 ?? this;
  h(this, I2).has(o4) || h(this, I2).set(o4, /* @__PURE__ */ new Set()), h(this, I2).get(o4).add(a2);
  try {
    await n3.exec(`LISTEN ${r}`);
  } catch (_3) {
    throw h(this, I2).get(o4).delete(a2), h(this, I2).get(o4)?.size === 0 && h(this, I2).delete(o4), _3;
  }
  return async (_3) => {
    await this.unlisten(o4, a2, _3);
  };
}, Ye2 = async function(r, a2, s4) {
  let o4 = Nr(r), n3 = s4 ?? this, _3 = async () => {
    await n3.exec(`UNLISTEN ${r}`), h(this, I2).get(o4)?.size === 0 && h(this, I2).delete(o4);
  };
  a2 ? (h(this, I2).get(o4)?.delete(a2), h(this, I2).get(o4)?.size === 0 && await _3()) : await _3();
}, L5.DEFAULT_RECV_BUF_SIZE = 1 * 1024 * 1024, L5.MAX_BUFFER_SIZE = Math.pow(2, 30);
var We2 = L5;
u();

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_3) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k4) => typeof obj[obj[k4]] !== "number");
    const filtered = {};
    for (const k4 of validKeys) {
      filtered[k4] = obj[k4];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_3, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t2 = typeof data;
  switch (t2) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i3 = 0;
          while (i3 < issue.path.length) {
            const el = issue.path[i3];
            const terminal = i3 === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i3++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m4) => !!m4).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x6) => !!x6)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s4 of results) {
      if (s4.status === "aborted")
        return INVALID;
      if (s4.status === "dirty")
        status.dirty();
      arrayValue.push(s4.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x6) => x6.status === "aborted";
var isDirty = (x6) => x6.status === "dirty";
var isValid = (x6) => x6.status === "valid";
var isAsync = (x6) => typeof Promise !== "undefined" && x6 instanceof Promise;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err2) {
        if (err2?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args2) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args2.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args2.precision}}`;
  } else if (args2.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args2.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args2) {
  return new RegExp(`^${timeRegexSource(args2)}$`);
}
function datetimeRegex(args2) {
  let regex = `${dateRegexSource}T${timeRegexSource(args2)}`;
  const opts = [];
  opts.push(args2.local ? `Z?` : `Z`);
  if (args2.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i3) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i3));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i3) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i3));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a2, b3) {
  const aType = getParsedType(a2);
  const bType = getParsedType(b3);
  if (a2 === b3) {
    return { valid: true, data: a2 };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b3);
    const sharedKeys = util.objectKeys(a2).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a2, ...b3 };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a2[key], b3[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a2.length !== b3.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a2.length; index++) {
      const itemA = a2[index];
      const itemB = b3[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a2 === +b3) {
    return { valid: true, data: a2 };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x6) => !!x6);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i3) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i3)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args2, error) {
      return makeIssue({
        data: args2,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x6) => !!x6),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x6) => !!x6),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn2 = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me3 = this;
      return OK(async function(...args2) {
        const error = new ZodError([]);
        const parsedArgs = await me3._def.args.parseAsync(args2, params).catch((e) => {
          error.addIssue(makeArgsIssue(args2, e));
          throw error;
        });
        const result = await Reflect.apply(fn2, this, parsedArgs);
        const parsedReturns = await me3._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me3 = this;
      return OK(function(...args2) {
        const parsedArgs = me3._def.args.safeParse(args2, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args2, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn2, this, parsedArgs.data);
        const parsedReturns = me3._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func2) {
    const validatedFunc = this.parse(func2);
    return validatedFunc;
  }
  strictImplement(func2) {
    const validatedFunc = this.parse(func2);
    return validatedFunc;
  }
  static create(args2, returns, params) {
    return new _ZodFunction({
      args: args2 ? args2 : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a2, b3) {
    return new _ZodPipeline({
      in: a2,
      out: b3,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p4 = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p22 = typeof p4 === "string" ? { message: p4 } : p4;
  return p22;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// packages/domain/src/entities/index.ts
var import_reflect_metadata = __toESM(require_Reflect());

// packages/domain/src/common/code.ts
var Code = class {
};
// Common
Code.SUCCESS = {
  code: 200,
  message: "Success."
};
Code.BAD_REQUEST_ERROR = {
  code: 400,
  message: "Bad request."
};
Code.UNAUTHORIZED_ERROR = {
  code: 401,
  message: "Unauthorized error."
};
Code.WRONG_CREDENTIALS_ERROR = {
  code: 402,
  message: "Wrong Credentials."
};
Code.ACCESS_DENIED_ERROR = {
  code: 403,
  message: "Access denied."
};
Code.INTERNAL_ERROR = {
  code: 500,
  message: "Internal error."
};
Code.ENTITY_NOT_FOUND_ERROR = {
  code: 1e3,
  message: "Entity not found."
};
Code.ENTITY_VALIDATION_ERROR = {
  code: 1001,
  message: "Entity validation error."
};
Code.USE_CASE_PORT_VALIDATION_ERROR = {
  code: 1002,
  message: "Use-case port validation error."
};
Code.VALUE_OBJECT_VALIDATION_ERROR = {
  code: 1003,
  message: "Value object validation error."
};
Code.ENTITY_ALREADY_EXISTS_ERROR = {
  code: 1004,
  message: "Entity already exists."
};
// Notebook - 2000-2099
Code.NOTEBOOK_NOT_FOUND_ERROR = {
  code: 2e3,
  message: "Notebook not found."
};
Code.NOTEBOOK_ALREADY_EXISTS_ERROR = {
  code: 2001,
  message: "Notebook already exists."
};
Code.NOTEBOOK_UPDATE_ERROR = {
  code: 2002,
  message: "Notebook update error."
};
Code.NOTEBOOK_DELETE_ERROR = {
  code: 2003,
  message: "Notebook delete error."
};
Code.NOTEBOOK_GET_ERROR = {
  code: 2004,
  message: "Notebook get error."
};
Code.NOTEBOOK_GET_ALL_ERROR = {
  code: 2005,
  message: "Notebook get all error."
};
Code.NOTEBOOK_CREATE_ERROR = {
  code: 2006,
  message: "Notebook create error."
};
// User - 2100-2199
Code.USER_NOT_FOUND_ERROR = {
  code: 2100,
  message: "User not found."
};
Code.USER_ALREADY_EXISTS_ERROR = {
  code: 2101,
  message: "User already exists."
};
Code.USER_UPDATE_ERROR = {
  code: 2102,
  message: "User update error."
};
Code.USER_DELETE_ERROR = {
  code: 2103,
  message: "User delete error."
};
Code.USER_GET_ERROR = {
  code: 2104,
  message: "User get error."
};
Code.USER_GET_ALL_ERROR = {
  code: 2105,
  message: "User get all error."
};
Code.USER_CREATE_ERROR = {
  code: 2106,
  message: "User create error."
};
// Workspace - 2200-2299
Code.WORKSPACE_NOT_FOUND_ERROR = {
  code: 2200,
  message: "Workspace not found."
};
Code.WORKSPACE_UPDATE_ERROR = {
  code: 2201,
  message: "Workspace update error."
};
Code.WORKSPACE_GET_ERROR = {
  code: 2203,
  message: "Workspace get error."
};
Code.WORKSPACE_CREATE_ERROR = {
  code: 2205,
  message: "Workspace create error."
};
// Organization - 2300-2399
Code.ORGANIZATION_NOT_FOUND_ERROR = {
  code: 2300,
  message: "Organization not found."
};
Code.ORGANIZATION_UPDATE_ERROR = {
  code: 2301,
  message: "Organization update error."
};
Code.ORGANIZATION_DELETE_ERROR = {
  code: 2302,
  message: "Organization delete error."
};
Code.ORGANIZATION_GET_ERROR = {
  code: 2303,
  message: "Organization get error."
};
Code.ORGANIZATION_GET_ALL_ERROR = {
  code: 2304,
  message: "Organization get all error."
};
Code.ORGANIZATION_CREATE_ERROR = {
  code: 2305,
  message: "Organization create error."
};
// Project - 2400-2499
Code.PROJECT_NOT_FOUND_ERROR = {
  code: 2400,
  message: "Project not found."
};
Code.PROJECT_UPDATE_ERROR = {
  code: 2401,
  message: "Project update error."
};
Code.PROJECT_DELETE_ERROR = {
  code: 2402,
  message: "Project delete error."
};
Code.PROJECT_GET_ERROR = {
  code: 2403,
  message: "Project get error."
};
Code.PROJECT_GET_ALL_ERROR = {
  code: 2404,
  message: "Project get all error."
};
Code.PROJECT_CREATE_ERROR = {
  code: 2405,
  message: "Project create error."
};
// Datasource - 2500-2599
Code.DATASOURCE_NOT_FOUND_ERROR = {
  code: 2500,
  message: "Datasource not found."
};
Code.DATASOURCE_ALREADY_EXISTS_ERROR = {
  code: 2501,
  message: "Datasource already exists."
};
Code.DATASOURCE_UPDATE_ERROR = {
  code: 2502,
  message: "Datasource update error."
};
Code.DATASOURCE_DELETE_ERROR = {
  code: 2503,
  message: "Datasource delete error."
};
Code.DATASOURCE_GET_ERROR = {
  code: 2504,
  message: "Datasource get error."
};
Code.DATASOURCE_GET_ALL_ERROR = {
  code: 2505,
  message: "Datasource get all error."
};
Code.DATASOURCE_CREATE_ERROR = {
  code: 2506,
  message: "Datasource create error."
};
// Agent - 2600-2699
Code.AGENT_SESSION_NOT_FOUND_ERROR = {
  code: 2600,
  message: "Agent session not found."
};
Code.STATE_MACHINE_NOT_FOUND_ERROR = {
  code: 2601,
  message: "State machine not found."
};
Code.INVALID_STATE_TRANSITION_ERROR = {
  code: 2602,
  message: "Invalid state transition."
};
// Conversation - 2700-2799
Code.CONVERSATION_NOT_FOUND_ERROR = {
  code: 2700,
  message: "Conversation not found."
};
Code.CONVERSATION_ALREADY_EXISTS_ERROR = {
  code: 2701,
  message: "Conversation already exists."
};
Code.CONVERSATION_UPDATE_ERROR = {
  code: 2702,
  message: "Conversation update error."
};
Code.CONVERSATION_DELETE_ERROR = {
  code: 2703,
  message: "Conversation delete error."
};
Code.CONVERSATION_GET_ERROR = {
  code: 2704,
  message: "Conversation get error."
};
Code.CONVERSATION_CREATE_ERROR = {
  code: 2705,
  message: "Conversation create error."
};
// Message - 2800-2899
Code.MESSAGE_NOT_FOUND_ERROR = {
  code: 2800,
  message: "Message not found."
};
Code.MESSAGE_ALREADY_EXISTS_ERROR = {
  code: 2801,
  message: "Message already exists."
};
Code.MESSAGE_UPDATE_ERROR = {
  code: 2802,
  message: "Message update error."
};
Code.MESSAGE_DELETE_ERROR = {
  code: 2803,
  message: "Message delete error."
};
Code.MESSAGE_GET_ERROR = {
  code: 2804,
  message: "Message get error."
};
Code.MESSAGE_CREATE_ERROR = {
  code: 2805,
  message: "Message create error."
};

// packages/domain/src/common/exception.ts
var Exception = class _Exception extends Error {
  constructor(codeDescription, overrideMessage, data) {
    super();
    this.name = this.constructor.name;
    this.code = codeDescription.code;
    this.data = data;
    this.message = overrideMessage || codeDescription.message;
    Error.captureStackTrace(this, this.constructor);
  }
  static new(payload) {
    return new _Exception(payload.code, payload.overrideMessage, payload.data);
  }
};

// packages/domain/src/common/entity.ts
var Entity = class {
  constructor(schema, id) {
    this.schema = schema;
    this.id = id;
  }
  getId() {
    if (typeof this.id === "undefined") {
      throw Exception.new({
        code: Code.ENTITY_VALIDATION_ERROR,
        overrideMessage: `${this.constructor.name}: ID is empty.`
      });
    }
    return this.id;
  }
  getData() {
    const data = { id: this.id };
    return data;
  }
  toDto() {
    const data = this.getData();
    const { schema, ...serializable } = data;
    return serializable;
  }
  async validate() {
    const data = this.getData();
    const result = this.schema.safeParse(data);
    if (!result.success) {
      throw Exception.new({
        code: Code.ENTITY_VALIDATION_ERROR,
        data: result.error.format()
      });
    }
  }
};

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/enums/transformation-type.enum.js
var TransformationType;
(function(TransformationType2) {
  TransformationType2[TransformationType2["PLAIN_TO_CLASS"] = 0] = "PLAIN_TO_CLASS";
  TransformationType2[TransformationType2["CLASS_TO_PLAIN"] = 1] = "CLASS_TO_PLAIN";
  TransformationType2[TransformationType2["CLASS_TO_CLASS"] = 2] = "CLASS_TO_CLASS";
})(TransformationType || (TransformationType = {}));

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/MetadataStorage.js
var MetadataStorage = (
  /** @class */
  (function() {
    function MetadataStorage2() {
      this._typeMetadatas = /* @__PURE__ */ new Map();
      this._transformMetadatas = /* @__PURE__ */ new Map();
      this._exposeMetadatas = /* @__PURE__ */ new Map();
      this._excludeMetadatas = /* @__PURE__ */ new Map();
      this._ancestorsMap = /* @__PURE__ */ new Map();
    }
    MetadataStorage2.prototype.addTypeMetadata = function(metadata2) {
      if (!this._typeMetadatas.has(metadata2.target)) {
        this._typeMetadatas.set(metadata2.target, /* @__PURE__ */ new Map());
      }
      this._typeMetadatas.get(metadata2.target).set(metadata2.propertyName, metadata2);
    };
    MetadataStorage2.prototype.addTransformMetadata = function(metadata2) {
      if (!this._transformMetadatas.has(metadata2.target)) {
        this._transformMetadatas.set(metadata2.target, /* @__PURE__ */ new Map());
      }
      if (!this._transformMetadatas.get(metadata2.target).has(metadata2.propertyName)) {
        this._transformMetadatas.get(metadata2.target).set(metadata2.propertyName, []);
      }
      this._transformMetadatas.get(metadata2.target).get(metadata2.propertyName).push(metadata2);
    };
    MetadataStorage2.prototype.addExposeMetadata = function(metadata2) {
      if (!this._exposeMetadatas.has(metadata2.target)) {
        this._exposeMetadatas.set(metadata2.target, /* @__PURE__ */ new Map());
      }
      this._exposeMetadatas.get(metadata2.target).set(metadata2.propertyName, metadata2);
    };
    MetadataStorage2.prototype.addExcludeMetadata = function(metadata2) {
      if (!this._excludeMetadatas.has(metadata2.target)) {
        this._excludeMetadatas.set(metadata2.target, /* @__PURE__ */ new Map());
      }
      this._excludeMetadatas.get(metadata2.target).set(metadata2.propertyName, metadata2);
    };
    MetadataStorage2.prototype.findTransformMetadatas = function(target, propertyName, transformationType) {
      return this.findMetadatas(this._transformMetadatas, target, propertyName).filter(function(metadata2) {
        if (!metadata2.options)
          return true;
        if (metadata2.options.toClassOnly === true && metadata2.options.toPlainOnly === true)
          return true;
        if (metadata2.options.toClassOnly === true) {
          return transformationType === TransformationType.CLASS_TO_CLASS || transformationType === TransformationType.PLAIN_TO_CLASS;
        }
        if (metadata2.options.toPlainOnly === true) {
          return transformationType === TransformationType.CLASS_TO_PLAIN;
        }
        return true;
      });
    };
    MetadataStorage2.prototype.findExcludeMetadata = function(target, propertyName) {
      return this.findMetadata(this._excludeMetadatas, target, propertyName);
    };
    MetadataStorage2.prototype.findExposeMetadata = function(target, propertyName) {
      return this.findMetadata(this._exposeMetadatas, target, propertyName);
    };
    MetadataStorage2.prototype.findExposeMetadataByCustomName = function(target, name2) {
      return this.getExposedMetadatas(target).find(function(metadata2) {
        return metadata2.options && metadata2.options.name === name2;
      });
    };
    MetadataStorage2.prototype.findTypeMetadata = function(target, propertyName) {
      return this.findMetadata(this._typeMetadatas, target, propertyName);
    };
    MetadataStorage2.prototype.getStrategy = function(target) {
      var excludeMap = this._excludeMetadatas.get(target);
      var exclude = excludeMap && excludeMap.get(void 0);
      var exposeMap = this._exposeMetadatas.get(target);
      var expose = exposeMap && exposeMap.get(void 0);
      if (exclude && expose || !exclude && !expose)
        return "none";
      return exclude ? "excludeAll" : "exposeAll";
    };
    MetadataStorage2.prototype.getExposedMetadatas = function(target) {
      return this.getMetadata(this._exposeMetadatas, target);
    };
    MetadataStorage2.prototype.getExcludedMetadatas = function(target) {
      return this.getMetadata(this._excludeMetadatas, target);
    };
    MetadataStorage2.prototype.getExposedProperties = function(target, transformationType) {
      return this.getExposedMetadatas(target).filter(function(metadata2) {
        if (!metadata2.options)
          return true;
        if (metadata2.options.toClassOnly === true && metadata2.options.toPlainOnly === true)
          return true;
        if (metadata2.options.toClassOnly === true) {
          return transformationType === TransformationType.CLASS_TO_CLASS || transformationType === TransformationType.PLAIN_TO_CLASS;
        }
        if (metadata2.options.toPlainOnly === true) {
          return transformationType === TransformationType.CLASS_TO_PLAIN;
        }
        return true;
      }).map(function(metadata2) {
        return metadata2.propertyName;
      });
    };
    MetadataStorage2.prototype.getExcludedProperties = function(target, transformationType) {
      return this.getExcludedMetadatas(target).filter(function(metadata2) {
        if (!metadata2.options)
          return true;
        if (metadata2.options.toClassOnly === true && metadata2.options.toPlainOnly === true)
          return true;
        if (metadata2.options.toClassOnly === true) {
          return transformationType === TransformationType.CLASS_TO_CLASS || transformationType === TransformationType.PLAIN_TO_CLASS;
        }
        if (metadata2.options.toPlainOnly === true) {
          return transformationType === TransformationType.CLASS_TO_PLAIN;
        }
        return true;
      }).map(function(metadata2) {
        return metadata2.propertyName;
      });
    };
    MetadataStorage2.prototype.clear = function() {
      this._typeMetadatas.clear();
      this._exposeMetadatas.clear();
      this._excludeMetadatas.clear();
      this._ancestorsMap.clear();
    };
    MetadataStorage2.prototype.getMetadata = function(metadatas, target) {
      var metadataFromTargetMap = metadatas.get(target);
      var metadataFromTarget;
      if (metadataFromTargetMap) {
        metadataFromTarget = Array.from(metadataFromTargetMap.values()).filter(function(meta) {
          return meta.propertyName !== void 0;
        });
      }
      var metadataFromAncestors = [];
      for (var _i = 0, _a = this.getAncestors(target); _i < _a.length; _i++) {
        var ancestor = _a[_i];
        var ancestorMetadataMap = metadatas.get(ancestor);
        if (ancestorMetadataMap) {
          var metadataFromAncestor = Array.from(ancestorMetadataMap.values()).filter(function(meta) {
            return meta.propertyName !== void 0;
          });
          metadataFromAncestors.push.apply(metadataFromAncestors, metadataFromAncestor);
        }
      }
      return metadataFromAncestors.concat(metadataFromTarget || []);
    };
    MetadataStorage2.prototype.findMetadata = function(metadatas, target, propertyName) {
      var metadataFromTargetMap = metadatas.get(target);
      if (metadataFromTargetMap) {
        var metadataFromTarget = metadataFromTargetMap.get(propertyName);
        if (metadataFromTarget) {
          return metadataFromTarget;
        }
      }
      for (var _i = 0, _a = this.getAncestors(target); _i < _a.length; _i++) {
        var ancestor = _a[_i];
        var ancestorMetadataMap = metadatas.get(ancestor);
        if (ancestorMetadataMap) {
          var ancestorResult = ancestorMetadataMap.get(propertyName);
          if (ancestorResult) {
            return ancestorResult;
          }
        }
      }
      return void 0;
    };
    MetadataStorage2.prototype.findMetadatas = function(metadatas, target, propertyName) {
      var metadataFromTargetMap = metadatas.get(target);
      var metadataFromTarget;
      if (metadataFromTargetMap) {
        metadataFromTarget = metadataFromTargetMap.get(propertyName);
      }
      var metadataFromAncestorsTarget = [];
      for (var _i = 0, _a = this.getAncestors(target); _i < _a.length; _i++) {
        var ancestor = _a[_i];
        var ancestorMetadataMap = metadatas.get(ancestor);
        if (ancestorMetadataMap) {
          if (ancestorMetadataMap.has(propertyName)) {
            metadataFromAncestorsTarget.push.apply(metadataFromAncestorsTarget, ancestorMetadataMap.get(propertyName));
          }
        }
      }
      return metadataFromAncestorsTarget.slice().reverse().concat((metadataFromTarget || []).slice().reverse());
    };
    MetadataStorage2.prototype.getAncestors = function(target) {
      if (!target)
        return [];
      if (!this._ancestorsMap.has(target)) {
        var ancestors = [];
        for (var baseClass = Object.getPrototypeOf(target.prototype.constructor); typeof baseClass.prototype !== "undefined"; baseClass = Object.getPrototypeOf(baseClass.prototype.constructor)) {
          ancestors.push(baseClass);
        }
        this._ancestorsMap.set(target, ancestors);
      }
      return this._ancestorsMap.get(target);
    };
    return MetadataStorage2;
  })()
);

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/storage.js
var defaultMetadataStorage = new MetadataStorage();

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/utils/get-global.util.js
function getGlobal() {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof self !== "undefined") {
    return self;
  }
}

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/utils/is-promise.util.js
function isPromise(p4) {
  return p4 !== null && typeof p4 === "object" && typeof p4.then === "function";
}

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/TransformOperationExecutor.js
var __spreadArray = function(to, from, pack) {
  if (pack || arguments.length === 2) for (var i3 = 0, l3 = from.length, ar2; i3 < l3; i3++) {
    if (ar2 || !(i3 in from)) {
      if (!ar2) ar2 = Array.prototype.slice.call(from, 0, i3);
      ar2[i3] = from[i3];
    }
  }
  return to.concat(ar2 || Array.prototype.slice.call(from));
};
function instantiateArrayType(arrayType2) {
  var array = new arrayType2();
  if (!(array instanceof Set) && !("push" in array)) {
    return [];
  }
  return array;
}
var TransformOperationExecutor = (
  /** @class */
  (function() {
    function TransformOperationExecutor2(transformationType, options) {
      this.transformationType = transformationType;
      this.options = options;
      this.recursionStack = /* @__PURE__ */ new Set();
    }
    TransformOperationExecutor2.prototype.transform = function(source, value, targetType, arrayType2, isMap, level) {
      var _this = this;
      if (level === void 0) {
        level = 0;
      }
      if (Array.isArray(value) || value instanceof Set) {
        var newValue_1 = arrayType2 && this.transformationType === TransformationType.PLAIN_TO_CLASS ? instantiateArrayType(arrayType2) : [];
        value.forEach(function(subValue, index) {
          var subSource = source ? source[index] : void 0;
          if (!_this.options.enableCircularCheck || !_this.isCircular(subValue)) {
            var realTargetType = void 0;
            if (typeof targetType !== "function" && targetType && targetType.options && targetType.options.discriminator && targetType.options.discriminator.property && targetType.options.discriminator.subTypes) {
              if (_this.transformationType === TransformationType.PLAIN_TO_CLASS) {
                realTargetType = targetType.options.discriminator.subTypes.find(function(subType) {
                  return subType.name === subValue[targetType.options.discriminator.property];
                });
                var options = { newObject: newValue_1, object: subValue, property: void 0 };
                var newType = targetType.typeFunction(options);
                realTargetType === void 0 ? realTargetType = newType : realTargetType = realTargetType.value;
                if (!targetType.options.keepDiscriminatorProperty)
                  delete subValue[targetType.options.discriminator.property];
              }
              if (_this.transformationType === TransformationType.CLASS_TO_CLASS) {
                realTargetType = subValue.constructor;
              }
              if (_this.transformationType === TransformationType.CLASS_TO_PLAIN) {
                subValue[targetType.options.discriminator.property] = targetType.options.discriminator.subTypes.find(function(subType) {
                  return subType.value === subValue.constructor;
                }).name;
              }
            } else {
              realTargetType = targetType;
            }
            var value_1 = _this.transform(subSource, subValue, realTargetType, void 0, subValue instanceof Map, level + 1);
            if (newValue_1 instanceof Set) {
              newValue_1.add(value_1);
            } else {
              newValue_1.push(value_1);
            }
          } else if (_this.transformationType === TransformationType.CLASS_TO_CLASS) {
            if (newValue_1 instanceof Set) {
              newValue_1.add(subValue);
            } else {
              newValue_1.push(subValue);
            }
          }
        });
        return newValue_1;
      } else if (targetType === String && !isMap) {
        if (value === null || value === void 0)
          return value;
        return String(value);
      } else if (targetType === Number && !isMap) {
        if (value === null || value === void 0)
          return value;
        return Number(value);
      } else if (targetType === Boolean && !isMap) {
        if (value === null || value === void 0)
          return value;
        return Boolean(value);
      } else if ((targetType === Date || value instanceof Date) && !isMap) {
        if (value instanceof Date) {
          return new Date(value.valueOf());
        }
        if (value === null || value === void 0)
          return value;
        return new Date(value);
      } else if (!!getGlobal().Buffer && (targetType === Buffer || value instanceof Buffer) && !isMap) {
        if (value === null || value === void 0)
          return value;
        return Buffer.from(value);
      } else if (isPromise(value) && !isMap) {
        return new Promise(function(resolve2, reject) {
          value.then(function(data) {
            return resolve2(_this.transform(void 0, data, targetType, void 0, void 0, level + 1));
          }, reject);
        });
      } else if (!isMap && value !== null && typeof value === "object" && typeof value.then === "function") {
        return value;
      } else if (typeof value === "object" && value !== null) {
        if (!targetType && value.constructor !== Object)
          if (!Array.isArray(value) && value.constructor === Array) {
          } else {
            targetType = value.constructor;
          }
        if (!targetType && source)
          targetType = source.constructor;
        if (this.options.enableCircularCheck) {
          this.recursionStack.add(value);
        }
        var keys = this.getKeys(targetType, value, isMap);
        var newValue = source ? source : {};
        if (!source && (this.transformationType === TransformationType.PLAIN_TO_CLASS || this.transformationType === TransformationType.CLASS_TO_CLASS)) {
          if (isMap) {
            newValue = /* @__PURE__ */ new Map();
          } else if (targetType) {
            newValue = new targetType();
          } else {
            newValue = {};
          }
        }
        var _loop_1 = function(key2) {
          if (key2 === "__proto__" || key2 === "constructor") {
            return "continue";
          }
          var valueKey = key2;
          var newValueKey = key2, propertyName = key2;
          if (!this_1.options.ignoreDecorators && targetType) {
            if (this_1.transformationType === TransformationType.PLAIN_TO_CLASS) {
              var exposeMetadata = defaultMetadataStorage.findExposeMetadataByCustomName(targetType, key2);
              if (exposeMetadata) {
                propertyName = exposeMetadata.propertyName;
                newValueKey = exposeMetadata.propertyName;
              }
            } else if (this_1.transformationType === TransformationType.CLASS_TO_PLAIN || this_1.transformationType === TransformationType.CLASS_TO_CLASS) {
              var exposeMetadata = defaultMetadataStorage.findExposeMetadata(targetType, key2);
              if (exposeMetadata && exposeMetadata.options && exposeMetadata.options.name) {
                newValueKey = exposeMetadata.options.name;
              }
            }
          }
          var subValue = void 0;
          if (this_1.transformationType === TransformationType.PLAIN_TO_CLASS) {
            subValue = value[valueKey];
          } else {
            if (value instanceof Map) {
              subValue = value.get(valueKey);
            } else if (value[valueKey] instanceof Function) {
              subValue = value[valueKey]();
            } else {
              subValue = value[valueKey];
            }
          }
          var type = void 0, isSubValueMap = subValue instanceof Map;
          if (targetType && isMap) {
            type = targetType;
          } else if (targetType) {
            var metadata_1 = defaultMetadataStorage.findTypeMetadata(targetType, propertyName);
            if (metadata_1) {
              var options = { newObject: newValue, object: value, property: propertyName };
              var newType = metadata_1.typeFunction ? metadata_1.typeFunction(options) : metadata_1.reflectedType;
              if (metadata_1.options && metadata_1.options.discriminator && metadata_1.options.discriminator.property && metadata_1.options.discriminator.subTypes) {
                if (!(value[valueKey] instanceof Array)) {
                  if (this_1.transformationType === TransformationType.PLAIN_TO_CLASS) {
                    type = metadata_1.options.discriminator.subTypes.find(function(subType) {
                      if (subValue && subValue instanceof Object && metadata_1.options.discriminator.property in subValue) {
                        return subType.name === subValue[metadata_1.options.discriminator.property];
                      }
                    });
                    type === void 0 ? type = newType : type = type.value;
                    if (!metadata_1.options.keepDiscriminatorProperty) {
                      if (subValue && subValue instanceof Object && metadata_1.options.discriminator.property in subValue) {
                        delete subValue[metadata_1.options.discriminator.property];
                      }
                    }
                  }
                  if (this_1.transformationType === TransformationType.CLASS_TO_CLASS) {
                    type = subValue.constructor;
                  }
                  if (this_1.transformationType === TransformationType.CLASS_TO_PLAIN) {
                    if (subValue) {
                      subValue[metadata_1.options.discriminator.property] = metadata_1.options.discriminator.subTypes.find(function(subType) {
                        return subType.value === subValue.constructor;
                      }).name;
                    }
                  }
                } else {
                  type = metadata_1;
                }
              } else {
                type = newType;
              }
              isSubValueMap = isSubValueMap || metadata_1.reflectedType === Map;
            } else if (this_1.options.targetMaps) {
              this_1.options.targetMaps.filter(function(map) {
                return map.target === targetType && !!map.properties[propertyName];
              }).forEach(function(map) {
                return type = map.properties[propertyName];
              });
            } else if (this_1.options.enableImplicitConversion && this_1.transformationType === TransformationType.PLAIN_TO_CLASS) {
              var reflectedType = Reflect.getMetadata("design:type", targetType.prototype, propertyName);
              if (reflectedType) {
                type = reflectedType;
              }
            }
          }
          var arrayType_1 = Array.isArray(value[valueKey]) ? this_1.getReflectedType(targetType, propertyName) : void 0;
          var subSource = source ? source[valueKey] : void 0;
          if (newValue.constructor.prototype) {
            var descriptor = Object.getOwnPropertyDescriptor(newValue.constructor.prototype, newValueKey);
            if ((this_1.transformationType === TransformationType.PLAIN_TO_CLASS || this_1.transformationType === TransformationType.CLASS_TO_CLASS) && // eslint-disable-next-line @typescript-eslint/unbound-method
            (descriptor && !descriptor.set || newValue[newValueKey] instanceof Function))
              return "continue";
          }
          if (!this_1.options.enableCircularCheck || !this_1.isCircular(subValue)) {
            var transformKey = this_1.transformationType === TransformationType.PLAIN_TO_CLASS ? newValueKey : key2;
            var finalValue = void 0;
            if (this_1.transformationType === TransformationType.CLASS_TO_PLAIN) {
              finalValue = value[transformKey];
              finalValue = this_1.applyCustomTransformations(finalValue, targetType, transformKey, value, this_1.transformationType);
              finalValue = value[transformKey] === finalValue ? subValue : finalValue;
              finalValue = this_1.transform(subSource, finalValue, type, arrayType_1, isSubValueMap, level + 1);
            } else {
              if (subValue === void 0 && this_1.options.exposeDefaultValues) {
                finalValue = newValue[newValueKey];
              } else {
                finalValue = this_1.transform(subSource, subValue, type, arrayType_1, isSubValueMap, level + 1);
                finalValue = this_1.applyCustomTransformations(finalValue, targetType, transformKey, value, this_1.transformationType);
              }
            }
            if (finalValue !== void 0 || this_1.options.exposeUnsetFields) {
              if (newValue instanceof Map) {
                newValue.set(newValueKey, finalValue);
              } else {
                newValue[newValueKey] = finalValue;
              }
            }
          } else if (this_1.transformationType === TransformationType.CLASS_TO_CLASS) {
            var finalValue = subValue;
            finalValue = this_1.applyCustomTransformations(finalValue, targetType, key2, value, this_1.transformationType);
            if (finalValue !== void 0 || this_1.options.exposeUnsetFields) {
              if (newValue instanceof Map) {
                newValue.set(newValueKey, finalValue);
              } else {
                newValue[newValueKey] = finalValue;
              }
            }
          }
        };
        var this_1 = this;
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
          var key = keys_1[_i];
          _loop_1(key);
        }
        if (this.options.enableCircularCheck) {
          this.recursionStack.delete(value);
        }
        return newValue;
      } else {
        return value;
      }
    };
    TransformOperationExecutor2.prototype.applyCustomTransformations = function(value, target, key, obj, transformationType) {
      var _this = this;
      var metadatas = defaultMetadataStorage.findTransformMetadatas(target, key, this.transformationType);
      if (this.options.version !== void 0) {
        metadatas = metadatas.filter(function(metadata2) {
          if (!metadata2.options)
            return true;
          return _this.checkVersion(metadata2.options.since, metadata2.options.until);
        });
      }
      if (this.options.groups && this.options.groups.length) {
        metadatas = metadatas.filter(function(metadata2) {
          if (!metadata2.options)
            return true;
          return _this.checkGroups(metadata2.options.groups);
        });
      } else {
        metadatas = metadatas.filter(function(metadata2) {
          return !metadata2.options || !metadata2.options.groups || !metadata2.options.groups.length;
        });
      }
      metadatas.forEach(function(metadata2) {
        value = metadata2.transformFn({ value, key, obj, type: transformationType, options: _this.options });
      });
      return value;
    };
    TransformOperationExecutor2.prototype.isCircular = function(object) {
      return this.recursionStack.has(object);
    };
    TransformOperationExecutor2.prototype.getReflectedType = function(target, propertyName) {
      if (!target)
        return void 0;
      var meta = defaultMetadataStorage.findTypeMetadata(target, propertyName);
      return meta ? meta.reflectedType : void 0;
    };
    TransformOperationExecutor2.prototype.getKeys = function(target, object, isMap) {
      var _this = this;
      var strategy = defaultMetadataStorage.getStrategy(target);
      if (strategy === "none")
        strategy = this.options.strategy || "exposeAll";
      var keys = [];
      if (strategy === "exposeAll" || isMap) {
        if (object instanceof Map) {
          keys = Array.from(object.keys());
        } else {
          keys = Object.keys(object);
        }
      }
      if (isMap) {
        return keys;
      }
      if (this.options.ignoreDecorators && this.options.excludeExtraneousValues && target) {
        var exposedProperties = defaultMetadataStorage.getExposedProperties(target, this.transformationType);
        var excludedProperties = defaultMetadataStorage.getExcludedProperties(target, this.transformationType);
        keys = __spreadArray(__spreadArray([], exposedProperties, true), excludedProperties, true);
      }
      if (!this.options.ignoreDecorators && target) {
        var exposedProperties = defaultMetadataStorage.getExposedProperties(target, this.transformationType);
        if (this.transformationType === TransformationType.PLAIN_TO_CLASS) {
          exposedProperties = exposedProperties.map(function(key) {
            var exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
            if (exposeMetadata && exposeMetadata.options && exposeMetadata.options.name) {
              return exposeMetadata.options.name;
            }
            return key;
          });
        }
        if (this.options.excludeExtraneousValues) {
          keys = exposedProperties;
        } else {
          keys = keys.concat(exposedProperties);
        }
        var excludedProperties_1 = defaultMetadataStorage.getExcludedProperties(target, this.transformationType);
        if (excludedProperties_1.length > 0) {
          keys = keys.filter(function(key) {
            return !excludedProperties_1.includes(key);
          });
        }
        if (this.options.version !== void 0) {
          keys = keys.filter(function(key) {
            var exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
            if (!exposeMetadata || !exposeMetadata.options)
              return true;
            return _this.checkVersion(exposeMetadata.options.since, exposeMetadata.options.until);
          });
        }
        if (this.options.groups && this.options.groups.length) {
          keys = keys.filter(function(key) {
            var exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
            if (!exposeMetadata || !exposeMetadata.options)
              return true;
            return _this.checkGroups(exposeMetadata.options.groups);
          });
        } else {
          keys = keys.filter(function(key) {
            var exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
            return !exposeMetadata || !exposeMetadata.options || !exposeMetadata.options.groups || !exposeMetadata.options.groups.length;
          });
        }
      }
      if (this.options.excludePrefixes && this.options.excludePrefixes.length) {
        keys = keys.filter(function(key) {
          return _this.options.excludePrefixes.every(function(prefix) {
            return key.substr(0, prefix.length) !== prefix;
          });
        });
      }
      keys = keys.filter(function(key, index, self2) {
        return self2.indexOf(key) === index;
      });
      return keys;
    };
    TransformOperationExecutor2.prototype.checkVersion = function(since, until) {
      var decision = true;
      if (decision && since)
        decision = this.options.version >= since;
      if (decision && until)
        decision = this.options.version < until;
      return decision;
    };
    TransformOperationExecutor2.prototype.checkGroups = function(groups) {
      if (!groups)
        return true;
      return this.options.groups.some(function(optionGroup) {
        return groups.includes(optionGroup);
      });
    };
    return TransformOperationExecutor2;
  })()
);

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/constants/default-options.constant.js
var defaultOptions = {
  enableCircularCheck: false,
  enableImplicitConversion: false,
  excludeExtraneousValues: false,
  excludePrefixes: void 0,
  exposeDefaultValues: false,
  exposeUnsetFields: true,
  groups: void 0,
  ignoreDecorators: false,
  strategy: void 0,
  targetMaps: void 0,
  version: void 0
};

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/ClassTransformer.js
var __assign = function() {
  __assign = Object.assign || function(t2) {
    for (var s4, i3 = 1, n3 = arguments.length; i3 < n3; i3++) {
      s4 = arguments[i3];
      for (var p4 in s4) if (Object.prototype.hasOwnProperty.call(s4, p4))
        t2[p4] = s4[p4];
    }
    return t2;
  };
  return __assign.apply(this, arguments);
};
var ClassTransformer = (
  /** @class */
  (function() {
    function ClassTransformer2() {
    }
    ClassTransformer2.prototype.instanceToPlain = function(object, options) {
      var executor = new TransformOperationExecutor(TransformationType.CLASS_TO_PLAIN, __assign(__assign({}, defaultOptions), options));
      return executor.transform(void 0, object, void 0, void 0, void 0, void 0);
    };
    ClassTransformer2.prototype.classToPlainFromExist = function(object, plainObject, options) {
      var executor = new TransformOperationExecutor(TransformationType.CLASS_TO_PLAIN, __assign(__assign({}, defaultOptions), options));
      return executor.transform(plainObject, object, void 0, void 0, void 0, void 0);
    };
    ClassTransformer2.prototype.plainToInstance = function(cls, plain, options) {
      var executor = new TransformOperationExecutor(TransformationType.PLAIN_TO_CLASS, __assign(__assign({}, defaultOptions), options));
      return executor.transform(void 0, plain, cls, void 0, void 0, void 0);
    };
    ClassTransformer2.prototype.plainToClassFromExist = function(clsObject, plain, options) {
      var executor = new TransformOperationExecutor(TransformationType.PLAIN_TO_CLASS, __assign(__assign({}, defaultOptions), options));
      return executor.transform(clsObject, plain, void 0, void 0, void 0, void 0);
    };
    ClassTransformer2.prototype.instanceToInstance = function(object, options) {
      var executor = new TransformOperationExecutor(TransformationType.CLASS_TO_CLASS, __assign(__assign({}, defaultOptions), options));
      return executor.transform(void 0, object, void 0, void 0, void 0, void 0);
    };
    ClassTransformer2.prototype.classToClassFromExist = function(object, fromObject, options) {
      var executor = new TransformOperationExecutor(TransformationType.CLASS_TO_CLASS, __assign(__assign({}, defaultOptions), options));
      return executor.transform(fromObject, object, void 0, void 0, void 0, void 0);
    };
    ClassTransformer2.prototype.serialize = function(object, options) {
      return JSON.stringify(this.instanceToPlain(object, options));
    };
    ClassTransformer2.prototype.deserialize = function(cls, json, options) {
      var jsonObject = JSON.parse(json);
      return this.plainToInstance(cls, jsonObject, options);
    };
    ClassTransformer2.prototype.deserializeArray = function(cls, json, options) {
      var jsonObject = JSON.parse(json);
      return this.plainToInstance(cls, jsonObject, options);
    };
    return ClassTransformer2;
  })()
);

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/decorators/exclude.decorator.js
function Exclude(options) {
  if (options === void 0) {
    options = {};
  }
  return function(object, propertyName) {
    defaultMetadataStorage.addExcludeMetadata({
      target: object instanceof Function ? object : object.constructor,
      propertyName,
      options
    });
  };
}

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/decorators/expose.decorator.js
function Expose(options) {
  if (options === void 0) {
    options = {};
  }
  return function(object, propertyName) {
    defaultMetadataStorage.addExposeMetadata({
      target: object instanceof Function ? object : object.constructor,
      propertyName,
      options
    });
  };
}

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/decorators/type.decorator.js
function Type(typeFunction, options) {
  if (options === void 0) {
    options = {};
  }
  return function(target, propertyName) {
    var reflectedType = Reflect.getMetadata("design:type", target, propertyName);
    defaultMetadataStorage.addTypeMetadata({
      target: target.constructor,
      propertyName,
      reflectedType,
      typeFunction,
      options
    });
  };
}

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/index.js
var classTransformer = new ClassTransformer();
function instanceToPlain(object, options) {
  return classTransformer.instanceToPlain(object, options);
}
function plainToClass(cls, plain, options) {
  return classTransformer.plainToInstance(cls, plain, options);
}

// node_modules/.pnpm/uuid@11.1.0/node_modules/uuid/dist/esm-browser/stringify.js
var byteToHex = [];
for (let i3 = 0; i3 < 256; ++i3) {
  byteToHex.push((i3 + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// node_modules/.pnpm/uuid@11.1.0/node_modules/uuid/dist/esm-browser/rng.js
var getRandomValues;
var rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
    getRandomValues = crypto.getRandomValues.bind(crypto);
  }
  return getRandomValues(rnds8);
}

// node_modules/.pnpm/uuid@11.1.0/node_modules/uuid/dist/esm-browser/native.js
var randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
var native_default = { randomUUID };

// node_modules/.pnpm/uuid@11.1.0/node_modules/uuid/dist/esm-browser/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length) {
      throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
    }
    for (let i3 = 0; i3 < 16; ++i3) {
      buf[offset + i3] = rnds[i3];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// node_modules/.pnpm/sqids@0.3.0/node_modules/sqids/esm/sqids.js
var defaultOptions2 = {
  alphabet: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  minLength: 0,
  blocklist: /* @__PURE__ */ new Set([
    "0rgasm",
    "1d10t",
    "1d1ot",
    "1di0t",
    "1diot",
    "1eccacu10",
    "1eccacu1o",
    "1eccacul0",
    "1eccaculo",
    "1mbec11e",
    "1mbec1le",
    "1mbeci1e",
    "1mbecile",
    "a11upat0",
    "a11upato",
    "a1lupat0",
    "a1lupato",
    "aand",
    "ah01e",
    "ah0le",
    "aho1e",
    "ahole",
    "al1upat0",
    "al1upato",
    "allupat0",
    "allupato",
    "ana1",
    "ana1e",
    "anal",
    "anale",
    "anus",
    "arrapat0",
    "arrapato",
    "arsch",
    "arse",
    "ass",
    "b00b",
    "b00be",
    "b01ata",
    "b0ceta",
    "b0iata",
    "b0ob",
    "b0obe",
    "b0sta",
    "b1tch",
    "b1te",
    "b1tte",
    "ba1atkar",
    "balatkar",
    "bastard0",
    "bastardo",
    "batt0na",
    "battona",
    "bitch",
    "bite",
    "bitte",
    "bo0b",
    "bo0be",
    "bo1ata",
    "boceta",
    "boiata",
    "boob",
    "boobe",
    "bosta",
    "bran1age",
    "bran1er",
    "bran1ette",
    "bran1eur",
    "bran1euse",
    "branlage",
    "branler",
    "branlette",
    "branleur",
    "branleuse",
    "c0ck",
    "c0g110ne",
    "c0g11one",
    "c0g1i0ne",
    "c0g1ione",
    "c0gl10ne",
    "c0gl1one",
    "c0gli0ne",
    "c0glione",
    "c0na",
    "c0nnard",
    "c0nnasse",
    "c0nne",
    "c0u111es",
    "c0u11les",
    "c0u1l1es",
    "c0u1lles",
    "c0ui11es",
    "c0ui1les",
    "c0uil1es",
    "c0uilles",
    "c11t",
    "c11t0",
    "c11to",
    "c1it",
    "c1it0",
    "c1ito",
    "cabr0n",
    "cabra0",
    "cabrao",
    "cabron",
    "caca",
    "cacca",
    "cacete",
    "cagante",
    "cagar",
    "cagare",
    "cagna",
    "cara1h0",
    "cara1ho",
    "caracu10",
    "caracu1o",
    "caracul0",
    "caraculo",
    "caralh0",
    "caralho",
    "cazz0",
    "cazz1mma",
    "cazzata",
    "cazzimma",
    "cazzo",
    "ch00t1a",
    "ch00t1ya",
    "ch00tia",
    "ch00tiya",
    "ch0d",
    "ch0ot1a",
    "ch0ot1ya",
    "ch0otia",
    "ch0otiya",
    "ch1asse",
    "ch1avata",
    "ch1er",
    "ch1ng0",
    "ch1ngadaz0s",
    "ch1ngadazos",
    "ch1ngader1ta",
    "ch1ngaderita",
    "ch1ngar",
    "ch1ngo",
    "ch1ngues",
    "ch1nk",
    "chatte",
    "chiasse",
    "chiavata",
    "chier",
    "ching0",
    "chingadaz0s",
    "chingadazos",
    "chingader1ta",
    "chingaderita",
    "chingar",
    "chingo",
    "chingues",
    "chink",
    "cho0t1a",
    "cho0t1ya",
    "cho0tia",
    "cho0tiya",
    "chod",
    "choot1a",
    "choot1ya",
    "chootia",
    "chootiya",
    "cl1t",
    "cl1t0",
    "cl1to",
    "clit",
    "clit0",
    "clito",
    "cock",
    "cog110ne",
    "cog11one",
    "cog1i0ne",
    "cog1ione",
    "cogl10ne",
    "cogl1one",
    "cogli0ne",
    "coglione",
    "cona",
    "connard",
    "connasse",
    "conne",
    "cou111es",
    "cou11les",
    "cou1l1es",
    "cou1lles",
    "coui11es",
    "coui1les",
    "couil1es",
    "couilles",
    "cracker",
    "crap",
    "cu10",
    "cu1att0ne",
    "cu1attone",
    "cu1er0",
    "cu1ero",
    "cu1o",
    "cul0",
    "culatt0ne",
    "culattone",
    "culer0",
    "culero",
    "culo",
    "cum",
    "cunt",
    "d11d0",
    "d11do",
    "d1ck",
    "d1ld0",
    "d1ldo",
    "damn",
    "de1ch",
    "deich",
    "depp",
    "di1d0",
    "di1do",
    "dick",
    "dild0",
    "dildo",
    "dyke",
    "encu1e",
    "encule",
    "enema",
    "enf01re",
    "enf0ire",
    "enfo1re",
    "enfoire",
    "estup1d0",
    "estup1do",
    "estupid0",
    "estupido",
    "etr0n",
    "etron",
    "f0da",
    "f0der",
    "f0ttere",
    "f0tters1",
    "f0ttersi",
    "f0tze",
    "f0utre",
    "f1ca",
    "f1cker",
    "f1ga",
    "fag",
    "fica",
    "ficker",
    "figa",
    "foda",
    "foder",
    "fottere",
    "fotters1",
    "fottersi",
    "fotze",
    "foutre",
    "fr0c10",
    "fr0c1o",
    "fr0ci0",
    "fr0cio",
    "fr0sc10",
    "fr0sc1o",
    "fr0sci0",
    "fr0scio",
    "froc10",
    "froc1o",
    "froci0",
    "frocio",
    "frosc10",
    "frosc1o",
    "frosci0",
    "froscio",
    "fuck",
    "g00",
    "g0o",
    "g0u1ne",
    "g0uine",
    "gandu",
    "go0",
    "goo",
    "gou1ne",
    "gouine",
    "gr0gnasse",
    "grognasse",
    "haram1",
    "harami",
    "haramzade",
    "hund1n",
    "hundin",
    "id10t",
    "id1ot",
    "idi0t",
    "idiot",
    "imbec11e",
    "imbec1le",
    "imbeci1e",
    "imbecile",
    "j1zz",
    "jerk",
    "jizz",
    "k1ke",
    "kam1ne",
    "kamine",
    "kike",
    "leccacu10",
    "leccacu1o",
    "leccacul0",
    "leccaculo",
    "m1erda",
    "m1gn0tta",
    "m1gnotta",
    "m1nch1a",
    "m1nchia",
    "m1st",
    "mam0n",
    "mamahuev0",
    "mamahuevo",
    "mamon",
    "masturbat10n",
    "masturbat1on",
    "masturbate",
    "masturbati0n",
    "masturbation",
    "merd0s0",
    "merd0so",
    "merda",
    "merde",
    "merdos0",
    "merdoso",
    "mierda",
    "mign0tta",
    "mignotta",
    "minch1a",
    "minchia",
    "mist",
    "musch1",
    "muschi",
    "n1gger",
    "neger",
    "negr0",
    "negre",
    "negro",
    "nerch1a",
    "nerchia",
    "nigger",
    "orgasm",
    "p00p",
    "p011a",
    "p01la",
    "p0l1a",
    "p0lla",
    "p0mp1n0",
    "p0mp1no",
    "p0mpin0",
    "p0mpino",
    "p0op",
    "p0rca",
    "p0rn",
    "p0rra",
    "p0uff1asse",
    "p0uffiasse",
    "p1p1",
    "p1pi",
    "p1r1a",
    "p1rla",
    "p1sc10",
    "p1sc1o",
    "p1sci0",
    "p1scio",
    "p1sser",
    "pa11e",
    "pa1le",
    "pal1e",
    "palle",
    "pane1e1r0",
    "pane1e1ro",
    "pane1eir0",
    "pane1eiro",
    "panele1r0",
    "panele1ro",
    "paneleir0",
    "paneleiro",
    "patakha",
    "pec0r1na",
    "pec0rina",
    "pecor1na",
    "pecorina",
    "pen1s",
    "pendej0",
    "pendejo",
    "penis",
    "pip1",
    "pipi",
    "pir1a",
    "pirla",
    "pisc10",
    "pisc1o",
    "pisci0",
    "piscio",
    "pisser",
    "po0p",
    "po11a",
    "po1la",
    "pol1a",
    "polla",
    "pomp1n0",
    "pomp1no",
    "pompin0",
    "pompino",
    "poop",
    "porca",
    "porn",
    "porra",
    "pouff1asse",
    "pouffiasse",
    "pr1ck",
    "prick",
    "pussy",
    "put1za",
    "puta",
    "puta1n",
    "putain",
    "pute",
    "putiza",
    "puttana",
    "queca",
    "r0mp1ba11e",
    "r0mp1ba1le",
    "r0mp1bal1e",
    "r0mp1balle",
    "r0mpiba11e",
    "r0mpiba1le",
    "r0mpibal1e",
    "r0mpiballe",
    "rand1",
    "randi",
    "rape",
    "recch10ne",
    "recch1one",
    "recchi0ne",
    "recchione",
    "retard",
    "romp1ba11e",
    "romp1ba1le",
    "romp1bal1e",
    "romp1balle",
    "rompiba11e",
    "rompiba1le",
    "rompibal1e",
    "rompiballe",
    "ruff1an0",
    "ruff1ano",
    "ruffian0",
    "ruffiano",
    "s1ut",
    "sa10pe",
    "sa1aud",
    "sa1ope",
    "sacanagem",
    "sal0pe",
    "salaud",
    "salope",
    "saugnapf",
    "sb0rr0ne",
    "sb0rra",
    "sb0rrone",
    "sbattere",
    "sbatters1",
    "sbattersi",
    "sborr0ne",
    "sborra",
    "sborrone",
    "sc0pare",
    "sc0pata",
    "sch1ampe",
    "sche1se",
    "sche1sse",
    "scheise",
    "scheisse",
    "schlampe",
    "schwachs1nn1g",
    "schwachs1nnig",
    "schwachsinn1g",
    "schwachsinnig",
    "schwanz",
    "scopare",
    "scopata",
    "sexy",
    "sh1t",
    "shit",
    "slut",
    "sp0mp1nare",
    "sp0mpinare",
    "spomp1nare",
    "spompinare",
    "str0nz0",
    "str0nza",
    "str0nzo",
    "stronz0",
    "stronza",
    "stronzo",
    "stup1d",
    "stupid",
    "succh1am1",
    "succh1ami",
    "succhiam1",
    "succhiami",
    "sucker",
    "t0pa",
    "tapette",
    "test1c1e",
    "test1cle",
    "testic1e",
    "testicle",
    "tette",
    "topa",
    "tr01a",
    "tr0ia",
    "tr0mbare",
    "tr1ng1er",
    "tr1ngler",
    "tring1er",
    "tringler",
    "tro1a",
    "troia",
    "trombare",
    "turd",
    "twat",
    "vaffancu10",
    "vaffancu1o",
    "vaffancul0",
    "vaffanculo",
    "vag1na",
    "vagina",
    "verdammt",
    "verga",
    "w1chsen",
    "wank",
    "wichsen",
    "x0ch0ta",
    "x0chota",
    "xana",
    "xoch0ta",
    "xochota",
    "z0cc01a",
    "z0cc0la",
    "z0cco1a",
    "z0ccola",
    "z1z1",
    "z1zi",
    "ziz1",
    "zizi",
    "zocc01a",
    "zocc0la",
    "zocco1a",
    "zoccola"
  ])
};
var Sqids = class {
  constructor(options) {
    var _a, _b, _c;
    const alphabet = (_a = options === null || options === void 0 ? void 0 : options.alphabet) !== null && _a !== void 0 ? _a : defaultOptions2.alphabet;
    const minLength = (_b = options === null || options === void 0 ? void 0 : options.minLength) !== null && _b !== void 0 ? _b : defaultOptions2.minLength;
    const blocklist = (_c = options === null || options === void 0 ? void 0 : options.blocklist) !== null && _c !== void 0 ? _c : defaultOptions2.blocklist;
    if (new Blob([alphabet]).size !== alphabet.length) {
      throw new Error("Alphabet cannot contain multibyte characters");
    }
    const minAlphabetLength = 3;
    if (alphabet.length < minAlphabetLength) {
      throw new Error(`Alphabet length must be at least ${minAlphabetLength}`);
    }
    if (new Set(alphabet).size !== alphabet.length) {
      throw new Error("Alphabet must contain unique characters");
    }
    const minLengthLimit = 255;
    if (typeof minLength !== "number" || minLength < 0 || minLength > minLengthLimit) {
      throw new Error(`Minimum length has to be between 0 and ${minLengthLimit}`);
    }
    const filteredBlocklist = /* @__PURE__ */ new Set();
    const alphabetChars = alphabet.toLowerCase().split("");
    for (const word of blocklist) {
      if (word.length >= 3) {
        const wordLowercased = word.toLowerCase();
        const wordChars = wordLowercased.split("");
        const intersection = wordChars.filter((c2) => alphabetChars.includes(c2));
        if (intersection.length === wordChars.length) {
          filteredBlocklist.add(wordLowercased);
        }
      }
    }
    this.alphabet = this.shuffle(alphabet);
    this.minLength = minLength;
    this.blocklist = filteredBlocklist;
  }
  encode(numbers) {
    if (numbers.length === 0) {
      return "";
    }
    const inRangeNumbers = numbers.filter((n3) => n3 >= 0 && n3 <= this.maxValue());
    if (inRangeNumbers.length !== numbers.length) {
      throw new Error(`Encoding supports numbers between 0 and ${this.maxValue()}`);
    }
    return this.encodeNumbers(numbers);
  }
  decode(id) {
    const ret = [];
    if (id === "") {
      return ret;
    }
    const alphabetChars = this.alphabet.split("");
    for (const c2 of id.split("")) {
      if (!alphabetChars.includes(c2)) {
        return ret;
      }
    }
    const prefix = id.charAt(0);
    const offset = this.alphabet.indexOf(prefix);
    let alphabet = this.alphabet.slice(offset) + this.alphabet.slice(0, offset);
    alphabet = alphabet.split("").reverse().join("");
    let slicedId = id.slice(1);
    while (slicedId.length > 0) {
      const separator = alphabet.slice(0, 1);
      const chunks = slicedId.split(separator);
      if (chunks.length > 0) {
        if (chunks[0] === "") {
          return ret;
        }
        ret.push(this.toNumber(chunks[0], alphabet.slice(1)));
        if (chunks.length > 1) {
          alphabet = this.shuffle(alphabet);
        }
      }
      slicedId = chunks.slice(1).join(separator);
    }
    return ret;
  }
  encodeNumbers(numbers, increment = 0) {
    if (increment > this.alphabet.length) {
      throw new Error("Reached max attempts to re-generate the ID");
    }
    let offset = numbers.reduce((a2, v3, i3) => this.alphabet[v3 % this.alphabet.length].codePointAt(0) + i3 + a2, numbers.length) % this.alphabet.length;
    offset = (offset + increment) % this.alphabet.length;
    let alphabet = this.alphabet.slice(offset) + this.alphabet.slice(0, offset);
    const prefix = alphabet.charAt(0);
    alphabet = alphabet.split("").reverse().join("");
    const ret = [prefix];
    for (let i3 = 0; i3 !== numbers.length; i3++) {
      const num = numbers[i3];
      ret.push(this.toId(num, alphabet.slice(1)));
      if (i3 < numbers.length - 1) {
        ret.push(alphabet.slice(0, 1));
        alphabet = this.shuffle(alphabet);
      }
    }
    let id = ret.join("");
    if (this.minLength > id.length) {
      id += alphabet.slice(0, 1);
      while (this.minLength - id.length > 0) {
        alphabet = this.shuffle(alphabet);
        id += alphabet.slice(0, Math.min(this.minLength - id.length, alphabet.length));
      }
    }
    if (this.isBlockedId(id)) {
      id = this.encodeNumbers(numbers, increment + 1);
    }
    return id;
  }
  shuffle(alphabet) {
    const chars = alphabet.split("");
    for (let i3 = 0, j3 = chars.length - 1; j3 > 0; i3++, j3--) {
      const r = (i3 * j3 + chars[i3].codePointAt(0) + chars[j3].codePointAt(0)) % chars.length;
      [chars[i3], chars[r]] = [chars[r], chars[i3]];
    }
    return chars.join("");
  }
  toId(num, alphabet) {
    const id = [];
    const chars = alphabet.split("");
    let result = num;
    do {
      id.unshift(chars[result % chars.length]);
      result = Math.floor(result / chars.length);
    } while (result > 0);
    return id.join("");
  }
  toNumber(id, alphabet) {
    const chars = alphabet.split("");
    return id.split("").reduce((a2, v3) => a2 * chars.length + chars.indexOf(v3), 0);
  }
  isBlockedId(id) {
    const lowercaseId = id.toLowerCase();
    for (const word of this.blocklist) {
      if (word.length <= lowercaseId.length) {
        if (lowercaseId.length <= 3 || word.length <= 3) {
          if (lowercaseId === word) {
            return true;
          }
        } else if (/\d/.test(word)) {
          if (lowercaseId.startsWith(word) || lowercaseId.endsWith(word)) {
            return true;
          }
        } else if (lowercaseId.includes(word)) {
          return true;
        }
      }
    }
    return false;
  }
  maxValue() {
    return Number.MAX_SAFE_INTEGER;
  }
};

// packages/domain/src/utils/shorten-id.ts
var sqids = new Sqids({
  alphabet: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  minLength: 10
});
function shortenId(id) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(id);
  let hash1 = 0;
  let hash2 = 0;
  let hash3 = 0;
  for (let i3 = 0; i3 < bytes.length; i3++) {
    const byte = bytes[i3];
    hash1 = (hash1 << 5) - hash1 + byte | 0;
    hash2 = hash2 * 33 + byte | 0;
    hash3 = hash3 << 3 ^ hash3 >> 28 ^ byte | 0;
  }
  const MAX_SAFE = Number.MAX_SAFE_INTEGER;
  const numbers = [
    Math.abs(hash1) % MAX_SAFE,
    Math.abs(hash2) % MAX_SAFE,
    Math.abs(hash3) % MAX_SAFE
  ];
  const encoded = sqids.encode(numbers);
  return encoded.slice(0, 10);
}

// packages/domain/src/utils/identity.generator.ts
function generateIdentity() {
  const id = v4_default();
  const slug = shortenId(id);
  return {
    id,
    slug
  };
}

// packages/domain/src/entities/datasource.type.ts
var DatasourceKind = /* @__PURE__ */ ((DatasourceKind2) => {
  DatasourceKind2["EMBEDDED"] = "embedded";
  DatasourceKind2["REMOTE"] = "remote";
  return DatasourceKind2;
})(DatasourceKind || {});
var DatasourceSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the datasource"),
  projectId: external_exports.string().uuid().describe("The unique identifier for the project"),
  name: external_exports.string().min(1).max(255).describe("The name of the datasource"),
  description: external_exports.string().min(1).max(1024).describe("The description of the datasource"),
  slug: external_exports.string().min(1).describe("The slug of the datasource"),
  datasource_provider: external_exports.string().min(1).describe("The provider of the datasource"),
  datasource_driver: external_exports.string().describe("The driver of the datasource"),
  datasource_kind: external_exports.nativeEnum(DatasourceKind).describe("The kind of the datasource"),
  config: external_exports.object({}).passthrough(),
  createdAt: external_exports.date().describe("The date and time the datasource was created"),
  updatedAt: external_exports.date().describe("The date and time the datasource was last updated"),
  createdBy: external_exports.string().describe("The user who created the datasource"),
  updatedBy: external_exports.string().describe("The user who last updated the datasource"),
  isPublic: external_exports.boolean().default(false).describe("If true, this datasource is publicly viewable"),
  remixedFrom: external_exports.string().uuid().optional().nullable().describe("If set, this datasource was remixed from another datasource")
});
var DatasourceEntity = class extends Entity {
  static create(newDatasource) {
    const { id, slug } = generateIdentity();
    const now = /* @__PURE__ */ new Date();
    const datasource = {
      id,
      projectId: newDatasource.projectId,
      name: newDatasource.name,
      slug,
      description: newDatasource.description || "",
      datasource_provider: newDatasource.datasource_provider,
      datasource_driver: newDatasource.datasource_driver,
      datasource_kind: newDatasource.datasource_kind,
      config: newDatasource.config || {},
      createdAt: now,
      updatedAt: now,
      createdBy: newDatasource.createdBy,
      updatedBy: newDatasource.createdBy,
      isPublic: false
    };
    return plainToClass(DatasourceEntity, DatasourceSchema.parse(datasource));
  }
  static update(datasource, datasourceDTO) {
    const date = /* @__PURE__ */ new Date();
    const updatedDatasource = {
      ...datasource,
      ...datasourceDTO.name && { name: datasourceDTO.name },
      ...datasourceDTO.description && {
        description: datasourceDTO.description
      },
      ...datasourceDTO.datasource_provider && {
        datasource_provider: datasourceDTO.datasource_provider
      },
      ...datasourceDTO.datasource_driver && {
        datasource_driver: datasourceDTO.datasource_driver
      },
      ...datasourceDTO.datasource_kind && {
        datasource_kind: datasourceDTO.datasource_kind
      },
      ...datasourceDTO.config && { config: datasourceDTO.config },
      ...datasourceDTO.updatedBy && { updatedBy: datasourceDTO.updatedBy },
      updatedAt: date
    };
    return plainToClass(
      DatasourceEntity,
      DatasourceSchema.parse(updatedDatasource)
    );
  }
};
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "projectId", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "description", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "slug", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "datasource_provider", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "datasource_driver", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "datasource_kind", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "config", 2);
__decorateClass([
  Expose(),
  Type(() => Date)
], DatasourceEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose(),
  Type(() => Date)
], DatasourceEntity.prototype, "updatedAt", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "createdBy", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "updatedBy", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "isPublic", 2);
__decorateClass([
  Expose()
], DatasourceEntity.prototype, "remixedFrom", 2);
DatasourceEntity = __decorateClass([
  Exclude()
], DatasourceEntity);

// packages/domain/src/enums/cellType.ts
var CellTypeSchema = external_exports.enum(["text", "query", "prompt", "code"]);

// packages/domain/src/enums/runMode.ts
var RunModeSchema = external_exports.enum(["default", "fixit"]);

// packages/domain/src/entities/notebook.type.ts
var CellSchema = external_exports.object({
  query: external_exports.string().optional().describe("The query of the cell"),
  cellType: external_exports.enum(CellTypeSchema.options).describe("The type of the cell"),
  cellId: external_exports.number().int().min(1).describe("The cell identifier"),
  datasources: external_exports.array(external_exports.string().min(1)).describe("The datasources to use for the cell"),
  isActive: external_exports.boolean().describe("Whether the cell is active"),
  runMode: external_exports.enum(RunModeSchema.options).describe("The run mode of the cell")
});
var NotebookSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the notebook"),
  projectId: external_exports.string().uuid().describe("The unique identifier for the project"),
  title: external_exports.string().min(1).max(255).describe("The title of the notebook"),
  description: external_exports.string().min(1).max(1024).optional().describe("The description of the notebook"),
  slug: external_exports.string().min(1).describe("The slug of the notebook"),
  version: external_exports.number().int().min(1).describe("The version of the notebook"),
  createdAt: external_exports.date().describe("The date and time the notebook was created"),
  updatedAt: external_exports.date().describe("The date and time the notebook was last updated"),
  datasources: external_exports.array(external_exports.string().min(1)).describe("The datasources to use for the Notebook"),
  cells: external_exports.array(CellSchema),
  createdBy: external_exports.string().uuid().optional().describe("The user who created the notebook"),
  isPublic: external_exports.boolean().default(false).describe("If true, this notebook is publicly viewable"),
  remixedFrom: external_exports.string().uuid().optional().nullable().describe("If set, this notebook was remixed from another notebook")
});
var NotebookEntity = class extends Entity {
  static create(newNotebook) {
    const { id, slug } = generateIdentity();
    const now = /* @__PURE__ */ new Date();
    const notebook = {
      id,
      projectId: newNotebook.projectId,
      title: newNotebook.title,
      description: newNotebook.description,
      slug,
      version: 1,
      createdAt: now,
      updatedAt: now,
      datasources: [],
      cells: [
        {
          cellId: 1,
          cellType: "query",
          query: "\n".repeat(9),
          // 10 lines total (9 newlines + 1 empty line)
          datasources: [],
          isActive: true,
          runMode: "default"
        }
      ],
      isPublic: false
    };
    return plainToClass(NotebookEntity, NotebookSchema.parse(notebook));
  }
  static update(notebook, notebookDTO) {
    const date = /* @__PURE__ */ new Date();
    const { cells, ...restDTO } = notebookDTO;
    const updatedNotebook = {
      ...notebook,
      ...restDTO,
      ...cells !== void 0 && { cells },
      updatedAt: date
    };
    const transformed = plainToClass(NotebookEntity, updatedNotebook);
    const plainData = instanceToPlain(transformed);
    return plainToClass(NotebookEntity, NotebookSchema.parse(plainData));
  }
};
__decorateClass([
  Expose()
], NotebookEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "projectId", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "title", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "description", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "slug", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "version", 2);
__decorateClass([
  Expose(),
  Type(() => Date)
], NotebookEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose(),
  Type(() => Date)
], NotebookEntity.prototype, "updatedAt", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "datasources", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "cells", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "createdBy", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "isPublic", 2);
__decorateClass([
  Expose()
], NotebookEntity.prototype, "remixedFrom", 2);
NotebookEntity = __decorateClass([
  Exclude()
], NotebookEntity);

// packages/domain/src/enums/workspace-mode.ts
var WorkspaceModeEnum = /* @__PURE__ */ ((WorkspaceModeEnum2) => {
  WorkspaceModeEnum2["SIMPLE"] = "simple";
  WorkspaceModeEnum2["ADVANCED"] = "advanced";
  return WorkspaceModeEnum2;
})(WorkspaceModeEnum || {});
var WorkspaceRuntimeEnum = /* @__PURE__ */ ((WorkspaceRuntimeEnum2) => {
  WorkspaceRuntimeEnum2["DESKTOP"] = "desktop";
  WorkspaceRuntimeEnum2["MOBILE"] = "mobile";
  WorkspaceRuntimeEnum2["BROWSER"] = "browser";
  return WorkspaceRuntimeEnum2;
})(WorkspaceRuntimeEnum || {});

// packages/domain/src/entities/workspace.type.ts
var WorkspaceModeSchema = external_exports.nativeEnum(WorkspaceModeEnum);
var WorkspaceRuntimeSchema = external_exports.nativeEnum(WorkspaceRuntimeEnum);
var WorkspaceSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the workspace"),
  userId: external_exports.string().uuid().describe("The id of the user"),
  username: external_exports.string().min(1).max(255).default("anonymous").describe("The username of the user"),
  organizationId: external_exports.string().uuid().optional().describe("The id of the organization"),
  projectId: external_exports.string().uuid().optional().describe("The id of the project"),
  isAnonymous: external_exports.boolean().default(true).describe("Whether the user is anonymous"),
  mode: WorkspaceModeSchema.describe("The mode of the workspace"),
  runtime: WorkspaceRuntimeSchema.describe("The runtime of the workspace")
});

// packages/domain/src/entities/organization.type.ts
var OrganizationSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The id of the organization"),
  name: external_exports.string().describe("The name of the organization"),
  slug: external_exports.string().min(1).describe("The slug of the organization"),
  userId: external_exports.string().uuid().describe("The id of the user who is the owner of the organization"),
  // timestamps
  createdAt: external_exports.date().describe("The date and time the organization was created"),
  updatedAt: external_exports.date().describe("The date and time the organization was last updated"),
  createdBy: external_exports.string().min(1).max(255).describe("The user who created the organization"),
  updatedBy: external_exports.string().min(1).max(255).describe("The user who last updated the organization")
});
var OrganizationEntity = class extends Entity {
  static create(newOrganization) {
    const { id, slug } = generateIdentity();
    const now = /* @__PURE__ */ new Date();
    const organization = {
      id,
      name: newOrganization.name,
      slug,
      userId: newOrganization.userId,
      createdAt: now,
      updatedAt: now,
      createdBy: newOrganization.createdBy,
      updatedBy: newOrganization.createdBy
    };
    return plainToClass(
      OrganizationEntity,
      OrganizationSchema.parse(organization)
    );
  }
  static update(organization, organizationDTO) {
    const date = /* @__PURE__ */ new Date();
    const updatedOrganization = {
      ...organization,
      ...organizationDTO.name && { name: organizationDTO.name },
      ...organizationDTO.userId !== void 0 && {
        userId: organizationDTO.userId
      },
      ...organizationDTO.updatedBy && {
        updatedBy: organizationDTO.updatedBy
      },
      updatedAt: date
    };
    return plainToClass(
      OrganizationEntity,
      OrganizationSchema.parse(updatedOrganization)
    );
  }
};
__decorateClass([
  Expose()
], OrganizationEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], OrganizationEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], OrganizationEntity.prototype, "slug", 2);
__decorateClass([
  Expose()
], OrganizationEntity.prototype, "userId", 2);
__decorateClass([
  Expose(),
  Type(() => Date)
], OrganizationEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose(),
  Type(() => Date)
], OrganizationEntity.prototype, "updatedAt", 2);
__decorateClass([
  Expose()
], OrganizationEntity.prototype, "createdBy", 2);
__decorateClass([
  Expose()
], OrganizationEntity.prototype, "updatedBy", 2);
OrganizationEntity = __decorateClass([
  Exclude()
], OrganizationEntity);

// packages/domain/src/entities/project.type.ts
var ProjectSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the project"),
  organizationId: external_exports.string().uuid().describe("The unique identifier for the organisation"),
  name: external_exports.string().min(1).max(255).describe("The name of the project"),
  slug: external_exports.string().min(1).describe("The slug of the project"),
  description: external_exports.string().min(1).max(1024).optional().describe("The description of the project"),
  status: external_exports.string().min(1).max(255).optional().describe("The status of the project"),
  createdAt: external_exports.date().describe("The date and time the project was created"),
  updatedAt: external_exports.date().describe("The date and time the project was last updated"),
  createdBy: external_exports.string().min(1).max(255).describe("The user who created the project"),
  updatedBy: external_exports.string().min(1).max(255).describe("The user who last updated the project")
});
var ProjectEntity = class extends Entity {
  static create(newProject) {
    const { id, slug } = generateIdentity();
    const now = /* @__PURE__ */ new Date();
    const project = {
      id,
      organizationId: newProject.organizationId,
      name: newProject.name,
      slug,
      description: newProject.description,
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: newProject.createdBy,
      updatedBy: newProject.createdBy
    };
    return plainToClass(ProjectEntity, ProjectSchema.parse(project));
  }
  static update(project, projectDTO) {
    const date = /* @__PURE__ */ new Date();
    const updatedProject = {
      ...project,
      ...projectDTO.name && { name: projectDTO.name },
      ...projectDTO.description && { description: projectDTO.description },
      ...projectDTO.status && { status: projectDTO.status },
      ...projectDTO.updatedBy && { updatedBy: projectDTO.updatedBy },
      updatedAt: date
    };
    return plainToClass(ProjectEntity, ProjectSchema.parse(updatedProject));
  }
};
__decorateClass([
  Expose()
], ProjectEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], ProjectEntity.prototype, "organizationId", 2);
__decorateClass([
  Expose()
], ProjectEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], ProjectEntity.prototype, "slug", 2);
__decorateClass([
  Expose()
], ProjectEntity.prototype, "description", 2);
__decorateClass([
  Expose()
], ProjectEntity.prototype, "status", 2);
__decorateClass([
  Expose(),
  Type(() => Date)
], ProjectEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose(),
  Type(() => Date)
], ProjectEntity.prototype, "updatedAt", 2);
__decorateClass([
  Expose()
], ProjectEntity.prototype, "createdBy", 2);
__decorateClass([
  Expose()
], ProjectEntity.prototype, "updatedBy", 2);
ProjectEntity = __decorateClass([
  Exclude()
], ProjectEntity);

// packages/domain/src/common/roles.ts
var Roles = /* @__PURE__ */ ((Roles2) => {
  Roles2["SUPER_ADMIN"] = "SUPER_ADMIN";
  Roles2["ADMIN"] = "ADMIN";
  Roles2["USER"] = "USER";
  return Roles2;
})(Roles || {});

// packages/domain/src/entities/user.type.ts
var UserRoleSchema = external_exports.nativeEnum(Roles).default("USER" /* USER */);
var UserSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the user"),
  username: external_exports.string().min(1).max(32).regex(/^[a-zA-Z0-9-]+$/, {
    message: "Username must contain only alphanumeric characters and dashes"
  }).describe("The name of the user (alphanumeric and dashes only)"),
  role: UserRoleSchema.describe("The role of the user"),
  createdAt: external_exports.date().describe("The date and time the user was created"),
  updatedAt: external_exports.date().describe("The date and time the user was last updated")
});

// packages/domain/src/entities/playground.type.ts
var PlaygroundSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the playground"),
  logo: external_exports.string().describe("The logo of the playground"),
  name: external_exports.string().min(1).max(255).describe("The name of the playground"),
  description: external_exports.string().min(1).max(1024).describe("The description of the playground"),
  datasource: DatasourceSchema.describe("The datasource for the playground")
});

// packages/domain/src/entities/template.type.ts
var TemplateKindSchema = external_exports.enum([
  "schema",
  "query",
  "notebook",
  "prompt",
  "dashboard",
  "app",
  "api",
  "report"
]);
var TemplateSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the template"),
  name: external_exports.string().min(1).max(255).describe("The name of the template"),
  description: external_exports.string().min(1).max(1024).describe("The description of the template"),
  slug: external_exports.string().min(1).describe("The slug of the template"),
  kind: external_exports.enum(TemplateKindSchema.options).describe("The type of the template"),
  version: external_exports.number().int().min(1).describe("The version of the template"),
  createdAt: external_exports.date().describe("The date and time the template was created"),
  updatedAt: external_exports.date().describe("The date and time the template was last updated"),
  createdBy: external_exports.string().min(1).max(255).describe("The user who created the template"),
  updatedBy: external_exports.string().min(1).max(255).describe("The user who last updated the template")
});

// packages/domain/src/entities/ai/agent.type.ts
var AgentSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the agent"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  description: external_exports.string().min(1).max(1024).describe("The description of the agent"),
  role: external_exports.string().min(1).max(255).describe("The role of the agent"),
  capabilities: external_exports.array(external_exports.string()).describe("The capabilities of the agent"),
  policies: external_exports.array(external_exports.string()).describe("The policies of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var AgentStateSchema = external_exports.object({
  messages: external_exports.array(
    external_exports.object({
      role: external_exports.enum(["user", "assistant", "system"]),
      content: external_exports.string()
    })
  )
});
var AgentEntity = class extends Entity {
};
__decorateClass([
  Expose()
], AgentEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], AgentEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], AgentEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], AgentEntity.prototype, "updatedAt", 2);
__decorateClass([
  Expose()
], AgentEntity.prototype, "createdBy", 2);
__decorateClass([
  Expose()
], AgentEntity.prototype, "updatedBy", 2);
AgentEntity = __decorateClass([
  Exclude()
], AgentEntity);

// packages/domain/src/entities/ai/action.type.ts
var ActionSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var ActionEntity = class extends Entity {
};
__decorateClass([
  Expose()
], ActionEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], ActionEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], ActionEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], ActionEntity.prototype, "updatedAt", 2);
ActionEntity = __decorateClass([
  Exclude()
], ActionEntity);

// packages/domain/src/entities/ai/context.type.ts
var ContextSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var ContextEntity = class extends Entity {
};
__decorateClass([
  Expose()
], ContextEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], ContextEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], ContextEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], ContextEntity.prototype, "updatedAt", 2);
ContextEntity = __decorateClass([
  Exclude()
], ContextEntity);

// packages/domain/src/entities/ai/conversation.type.ts
var ConversationSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  title: external_exports.string().describe("The title of the conversation"),
  seedMessage: external_exports.string().optional().describe("The seed message for the conversation"),
  taskId: external_exports.string().uuid().describe("The unique identifier for the task"),
  projectId: external_exports.string().uuid().describe("The unique identifier for the project"),
  slug: external_exports.string().describe("The slug of the conversation"),
  datasources: external_exports.array(external_exports.string().min(1)).describe("The datasources to use for the conversation"),
  createdAt: external_exports.date().describe("The date and time the conversation was created"),
  updatedAt: external_exports.date().describe("The date and time the conversation was last updated"),
  createdBy: external_exports.string().describe("The user who created the conversation"),
  updatedBy: external_exports.string().describe("The user who last updated the conversation"),
  isPublic: external_exports.boolean().default(false).describe("If true, this conversation is publicly viewable"),
  remixedFrom: external_exports.string().uuid().optional().nullable().describe(
    "If set, this conversation was remixed from another conversation"
  )
});
var ConversationEntity = class extends Entity {
  static create(newConversation) {
    const { id, slug } = generateIdentity();
    const now = /* @__PURE__ */ new Date();
    const conversation = {
      id,
      projectId: newConversation.projectId,
      taskId: newConversation.taskId,
      title: newConversation.title,
      seedMessage: newConversation.seedMessage,
      slug,
      datasources: newConversation.datasources || [],
      createdAt: now,
      updatedAt: now,
      createdBy: newConversation.createdBy,
      updatedBy: newConversation.createdBy,
      isPublic: false
    };
    return plainToClass(
      ConversationEntity,
      ConversationSchema.parse(conversation)
    );
  }
  static update(conversation, conversationDTO) {
    const date = /* @__PURE__ */ new Date();
    const updatedConversation = {
      ...conversation,
      ...conversationDTO.title && { title: conversationDTO.title },
      ...conversationDTO.datasources && {
        datasources: conversationDTO.datasources
      },
      updatedAt: date,
      updatedBy: conversationDTO.updatedBy
    };
    const transformed = plainToClass(ConversationEntity, updatedConversation);
    const plainData = instanceToPlain(transformed);
    return plainToClass(
      ConversationEntity,
      ConversationSchema.parse(plainData)
    );
  }
};
__decorateClass([
  Expose()
], ConversationEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], ConversationEntity.prototype, "title", 2);
__decorateClass([
  Expose()
], ConversationEntity.prototype, "seedMessage", 2);
__decorateClass([
  Expose()
], ConversationEntity.prototype, "projectId", 2);
__decorateClass([
  Expose()
], ConversationEntity.prototype, "slug", 2);
__decorateClass([
  Expose()
], ConversationEntity.prototype, "datasources", 2);
__decorateClass([
  Expose()
], ConversationEntity.prototype, "taskId", 2);
__decorateClass([
  Expose(),
  Type(() => Date)
], ConversationEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose(),
  Type(() => Date)
], ConversationEntity.prototype, "updatedAt", 2);
__decorateClass([
  Expose()
], ConversationEntity.prototype, "createdBy", 2);
__decorateClass([
  Expose()
], ConversationEntity.prototype, "updatedBy", 2);
__decorateClass([
  Expose()
], ConversationEntity.prototype, "isPublic", 2);
__decorateClass([
  Expose()
], ConversationEntity.prototype, "remixedFrom", 2);
ConversationEntity = __decorateClass([
  Exclude()
], ConversationEntity);

// packages/domain/src/entities/ai/memory.type.ts
var MemorySchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var MemoryEntity = class extends Entity {
};
__decorateClass([
  Expose()
], MemoryEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], MemoryEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], MemoryEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], MemoryEntity.prototype, "updatedAt", 2);
MemoryEntity = __decorateClass([
  Exclude()
], MemoryEntity);

// packages/domain/src/entities/ai/message.type.ts
var MessageRole = /* @__PURE__ */ ((MessageRole2) => {
  MessageRole2["USER"] = "user";
  MessageRole2["ASSISTANT"] = "assistant";
  MessageRole2["SYSTEM"] = "system";
  return MessageRole2;
})(MessageRole || {});
var MessageSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  conversationId: external_exports.string().uuid().describe("The unique identifier for the conversation"),
  content: external_exports.record(external_exports.string(), external_exports.any()).describe("The content of the message"),
  role: external_exports.nativeEnum(MessageRole).describe("The role of the message"),
  metadata: external_exports.record(external_exports.string(), external_exports.any()).describe("The metadata of the message"),
  createdAt: external_exports.date().describe("The date and time the message was created"),
  updatedAt: external_exports.date().describe("The date and time the message was last updated"),
  createdBy: external_exports.string().describe("The user who created the message"),
  updatedBy: external_exports.string().describe("The user who last updated the message")
});
var MessageEntity = class extends Entity {
  static create(newMessage) {
    const { id } = generateIdentity();
    const now = /* @__PURE__ */ new Date();
    const message = {
      id,
      conversationId: newMessage.conversationId,
      content: newMessage.content,
      role: newMessage.role,
      metadata: newMessage.metadata || {},
      createdAt: now,
      updatedAt: now,
      createdBy: newMessage.createdBy,
      updatedBy: newMessage.createdBy
    };
    return plainToClass(MessageEntity, MessageSchema.parse(message));
  }
  static update(message, messageDTO) {
    const date = /* @__PURE__ */ new Date();
    const updatedMessage = {
      ...message,
      ...messageDTO.content && { content: messageDTO.content },
      ...messageDTO.metadata && { metadata: messageDTO.metadata },
      updatedAt: date,
      updatedBy: messageDTO.updatedBy
    };
    return plainToClass(MessageEntity, MessageSchema.parse(updatedMessage));
  }
};
__decorateClass([
  Expose()
], MessageEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], MessageEntity.prototype, "conversationId", 2);
__decorateClass([
  Expose()
], MessageEntity.prototype, "content", 2);
__decorateClass([
  Expose()
], MessageEntity.prototype, "role", 2);
__decorateClass([
  Expose()
], MessageEntity.prototype, "metadata", 2);
__decorateClass([
  Expose()
], MessageEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], MessageEntity.prototype, "updatedAt", 2);
__decorateClass([
  Expose()
], MessageEntity.prototype, "createdBy", 2);
__decorateClass([
  Expose()
], MessageEntity.prototype, "updatedBy", 2);
MessageEntity = __decorateClass([
  Exclude()
], MessageEntity);

// packages/domain/src/entities/ai/model.type.ts
var ModelSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var ModelEntity = class extends Entity {
};
__decorateClass([
  Expose()
], ModelEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], ModelEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], ModelEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], ModelEntity.prototype, "updatedAt", 2);
ModelEntity = __decorateClass([
  Exclude()
], ModelEntity);

// packages/domain/src/entities/ai/observation.type.ts
var ObservationSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var ObservationEntity = class extends Entity {
};
__decorateClass([
  Expose()
], ObservationEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], ObservationEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], ObservationEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], ObservationEntity.prototype, "updatedAt", 2);
ObservationEntity = __decorateClass([
  Exclude()
], ObservationEntity);

// packages/domain/src/entities/ai/outcome.type.ts
var OutcomeSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var OutcomeEntity = class extends Entity {
};
__decorateClass([
  Expose()
], OutcomeEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], OutcomeEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], OutcomeEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], OutcomeEntity.prototype, "updatedAt", 2);
OutcomeEntity = __decorateClass([
  Exclude()
], OutcomeEntity);

// packages/domain/src/entities/ai/plan.type.ts
var PlanSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var PlanEntity = class extends Entity {
};
__decorateClass([
  Expose()
], PlanEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], PlanEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], PlanEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], PlanEntity.prototype, "updatedAt", 2);
PlanEntity = __decorateClass([
  Exclude()
], PlanEntity);

// packages/domain/src/entities/ai/prompt.type.ts
var PromptSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var PromptEntity = class extends Entity {
};
__decorateClass([
  Expose()
], PromptEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], PromptEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], PromptEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], PromptEntity.prototype, "updatedAt", 2);
PromptEntity = __decorateClass([
  Exclude()
], PromptEntity);

// packages/domain/src/entities/ai/task.type.ts
var TaskSchema = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var TaskEntity = class extends Entity {
};
__decorateClass([
  Expose()
], TaskEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], TaskEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], TaskEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], TaskEntity.prototype, "updatedAt", 2);
TaskEntity = __decorateClass([
  Exclude()
], TaskEntity);

// packages/domain/src/entities/ai/usage.type.ts
var UsageSchema = external_exports.object({
  id: external_exports.number().describe("The unique identifier for the action").default(Date.now()),
  conversationId: external_exports.string().describe("The unique identifier for the conversation"),
  projectId: external_exports.string().describe("The unique identifier for the project"),
  organizationId: external_exports.string().describe("The unique identifier for the organization"),
  userId: external_exports.string().describe("The unique identifier for the user"),
  model: external_exports.string().describe("The name of the model"),
  inputTokens: external_exports.number().describe("The total number of input tokens used").default(0),
  outputTokens: external_exports.number().describe("The total number of output tokens used").default(0),
  totalTokens: external_exports.number().describe("The total number of tokens used").default(0),
  reasoningTokens: external_exports.number().describe("The total number of reasoning tokens used").default(0),
  cachedInputTokens: external_exports.number().describe("The total number of cached input tokens used").default(0),
  contextSize: external_exports.number().describe("The used context size of the model").default(0),
  creditsCap: external_exports.number().describe("The maximum number of credits capacity").default(0),
  creditsUsed: external_exports.number().describe("The number of credits used").default(0),
  cpu: external_exports.number().describe("The CPU usage in percentage").default(0),
  memory: external_exports.number().describe("The memory usage in percentage").default(0),
  network: external_exports.number().describe("The network usage in percentage").default(0),
  gpu: external_exports.number().describe("The GPU usage in percentage").default(0),
  storage: external_exports.number().describe("The storage usage in percentage").default(0)
});
var UsageEntity = class extends Entity {
  static new(usage) {
    return plainToClass(UsageEntity, UsageSchema.parse(usage), {
      excludeExtraneousValues: true
    });
  }
};
__decorateClass([
  Expose()
], UsageEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "conversationId", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "projectId", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "organizationId", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "userId", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "model", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "inputTokens", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "outputTokens", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "totalTokens", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "reasoningTokens", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "cachedInputTokens", 2);
__decorateClass([
  Expose()
], UsageEntity.prototype, "contextSize", 2);
UsageEntity = __decorateClass([
  Exclude()
], UsageEntity);

// packages/domain/src/entities/ai/workspace.type.ts
var WorkspaceSchema2 = external_exports.object({
  id: external_exports.string().uuid().describe("The unique identifier for the action"),
  name: external_exports.string().min(1).max(255).describe("The name of the agent"),
  createdAt: external_exports.date().describe("The date and time the agent was created"),
  updatedAt: external_exports.date().describe("The date and time the agent was last updated"),
  createdBy: external_exports.string().describe("The user who created the agent"),
  updatedBy: external_exports.string().describe("The user who last updated the agent")
});
var WorkspaceEntity = class extends Entity {
};
__decorateClass([
  Expose()
], WorkspaceEntity.prototype, "id", 2);
__decorateClass([
  Expose()
], WorkspaceEntity.prototype, "name", 2);
__decorateClass([
  Expose()
], WorkspaceEntity.prototype, "createdAt", 2);
__decorateClass([
  Expose()
], WorkspaceEntity.prototype, "updatedAt", 2);
WorkspaceEntity = __decorateClass([
  Exclude()
], WorkspaceEntity);

// packages/domain/src/entities/datasource-meta/columns.type.ts
var ColumnZodSchema = external_exports.object({
  id: external_exports.string(),
  table_id: external_exports.number(),
  schema: external_exports.string(),
  table: external_exports.string(),
  name: external_exports.string(),
  ordinal_position: external_exports.number(),
  data_type: external_exports.string(),
  format: external_exports.string(),
  is_identity: external_exports.boolean(),
  identity_generation: external_exports.string().nullable(),
  is_generated: external_exports.boolean(),
  is_nullable: external_exports.boolean(),
  is_updatable: external_exports.boolean(),
  is_unique: external_exports.boolean(),
  check: external_exports.string().nullable(),
  default_value: external_exports.any().nullable(),
  enums: external_exports.array(external_exports.string()),
  comment: external_exports.string().nullable()
}).passthrough();
var ColumnArrayZodSchema = external_exports.array(ColumnZodSchema);

// packages/domain/src/entities/datasource-meta/tables.type.ts
var TablePrimaryKeyZodSchema = external_exports.object({
  table_id: external_exports.number(),
  name: external_exports.string(),
  schema: external_exports.string(),
  table_name: external_exports.string()
});
var TableRelationshipZodSchema = external_exports.object({
  id: external_exports.number(),
  constraint_name: external_exports.string(),
  source_schema: external_exports.string(),
  source_table_name: external_exports.string(),
  source_column_name: external_exports.string(),
  target_table_schema: external_exports.string(),
  target_table_name: external_exports.string(),
  target_column_name: external_exports.string()
});
var TableZodSchema = external_exports.object({
  id: external_exports.number(),
  schema: external_exports.string(),
  name: external_exports.string(),
  rls_enabled: external_exports.boolean(),
  rls_forced: external_exports.boolean(),
  bytes: external_exports.number(),
  size: external_exports.string(),
  live_rows_estimate: external_exports.number(),
  dead_rows_estimate: external_exports.number(),
  comment: external_exports.string().nullable(),
  primary_keys: external_exports.array(TablePrimaryKeyZodSchema),
  relationships: external_exports.array(TableRelationshipZodSchema),
  columns: ColumnArrayZodSchema.optional()
}).passthrough();
var TableArrayZodSchema = external_exports.array(TableZodSchema);

// packages/domain/src/entities/datasource-meta/schema.type.ts
var SchemaZod = external_exports.object({
  id: external_exports.number(),
  name: external_exports.string(),
  owner: external_exports.string()
}).passthrough();
var SchemaArrayZod = external_exports.array(SchemaZod);
var SchemaOptionalZod = external_exports.optional(SchemaZod);

// packages/domain/src/entities/datasource-meta/extensions.type.ts
var DatasourceExtensionZod = external_exports.object({
  name: external_exports.string(),
  schema: external_exports.string().nullable(),
  default_version: external_exports.string(),
  installed_version: external_exports.string().nullable(),
  comment: external_exports.string()
}).passthrough();
var DatasourceExtensionArrayZod = external_exports.array(DatasourceExtensionZod);
var DatasourceExtensionOptionalZod = external_exports.optional(
  DatasourceExtensionZod
);

// packages/domain/src/entities/datasource-meta/version.type.ts
var DatasourceVersionZodSchema = external_exports.object({
  version: external_exports.string(),
  version_number: external_exports.number(),
  active_connections: external_exports.number(),
  max_connections: external_exports.number()
});

// packages/domain/src/entities/datasource-meta/views.type.ts
var ViewZodSchema = external_exports.object({
  id: external_exports.number(),
  schema: external_exports.string(),
  name: external_exports.string(),
  is_updatable: external_exports.boolean(),
  comment: external_exports.string().nullable(),
  columns: ColumnArrayZodSchema.optional()
}).passthrough();
var ViewArrayZodSchema = external_exports.array(ViewZodSchema);
var ViewOptionalZodSchema = external_exports.optional(ViewZodSchema);

// packages/domain/src/entities/datasource-meta/functions.type.ts
var FunctionZodSchema = external_exports.object({
  id: external_exports.number(),
  schema: external_exports.string(),
  name: external_exports.string(),
  language: external_exports.string(),
  definition: external_exports.string(),
  complete_statement: external_exports.string(),
  args: external_exports.array(
    external_exports.object({
      mode: external_exports.union([
        external_exports.literal("in"),
        external_exports.literal("out"),
        external_exports.literal("inout"),
        external_exports.literal("variadic"),
        external_exports.literal("table")
      ]),
      name: external_exports.string(),
      type_id: external_exports.number(),
      has_default: external_exports.boolean()
    })
  ),
  argument_types: external_exports.string(),
  identity_argument_types: external_exports.string(),
  return_type_id: external_exports.number(),
  return_type: external_exports.string(),
  return_type_relation_id: external_exports.union([external_exports.number(), external_exports.null()]),
  is_set_returning_function: external_exports.boolean(),
  config_params: external_exports.union([external_exports.record(external_exports.string(), external_exports.string()), external_exports.null()])
}).passthrough();
var FunctionArrayZodSchema = external_exports.array(FunctionZodSchema);
var FunctionOptionalZodSchema = external_exports.optional(FunctionZodSchema);

// packages/domain/src/entities/datasource-meta/column-privileges.type.ts
var ColumnPrivilegeGrantZodSchema = external_exports.object({
  grantor: external_exports.string(),
  grantee: external_exports.string(),
  privilege_type: external_exports.union([
    external_exports.literal("SELECT"),
    external_exports.literal("INSERT"),
    external_exports.literal("UPDATE"),
    external_exports.literal("REFERENCES")
  ]),
  is_grantable: external_exports.boolean()
});
var ColumnPrivilegesZodSchema = external_exports.object({
  column_id: external_exports.string(),
  relation_schema: external_exports.string(),
  relation_name: external_exports.string(),
  column_name: external_exports.string(),
  privileges: external_exports.array(ColumnPrivilegeGrantZodSchema)
});
var ColumnPrivilegesArrayZodSchema = external_exports.array(
  ColumnPrivilegesZodSchema
);
var _PrivilegeGrantZodSchema = external_exports.object({
  columnId: external_exports.string(),
  grantee: external_exports.string(),
  privilegeType: external_exports.union([
    external_exports.literal("ALL"),
    external_exports.literal("SELECT"),
    external_exports.literal("INSERT"),
    external_exports.literal("UPDATE"),
    external_exports.literal("REFERENCES")
  ]),
  isGrantable: external_exports.boolean().optional()
});

// packages/domain/src/entities/datasource-meta/foreign-tables.type.ts
var ForeignTableZodSchema = external_exports.object({
  id: external_exports.number(),
  schema: external_exports.string(),
  name: external_exports.string(),
  comment: external_exports.string().nullable(),
  foreign_server_name: external_exports.string(),
  foreign_data_wrapper_name: external_exports.string(),
  foreign_data_wrapper_handler: external_exports.string(),
  columns: ColumnArrayZodSchema.optional()
});
var ForeignTableArrayZodSchema = external_exports.array(ForeignTableZodSchema);
var ForeignTableOptionalZodSchema = external_exports.optional(ForeignTableZodSchema);

// packages/domain/src/entities/datasource-meta/indexes.type.ts
var IndexZodSchema = external_exports.object({
  id: external_exports.number(),
  table_id: external_exports.number(),
  schema: external_exports.string(),
  name: external_exports.string().optional(),
  is_unique: external_exports.boolean(),
  is_primary: external_exports.boolean(),
  index_definition: external_exports.string(),
  access_method: external_exports.string(),
  columns: external_exports.array(external_exports.string()).optional(),
  comment: external_exports.string().nullable(),
  index_attributes: external_exports.array(
    external_exports.object({
      attribute_number: external_exports.number().optional(),
      attribute_name: external_exports.string(),
      data_type: external_exports.string().optional()
    })
  ).optional()
}).passthrough();
var IndexArrayZodSchema = external_exports.array(IndexZodSchema);
var IndexOptionalZodSchema = external_exports.optional(IndexZodSchema);

// packages/domain/src/entities/datasource-meta/materialized-views.type.ts
var MaterializedViewZodSchema = external_exports.object({
  id: external_exports.number(),
  schema: external_exports.string(),
  name: external_exports.string(),
  is_populated: external_exports.boolean(),
  comment: external_exports.string().nullable(),
  columns: ColumnArrayZodSchema.optional()
}).passthrough();
var MaterializedViewArrayZodSchema = external_exports.array(
  MaterializedViewZodSchema
);
var MaterializedViewOptionalZodSchema = external_exports.optional(
  MaterializedViewZodSchema
);

// packages/domain/src/entities/datasource-meta/policies.type.ts
var PolicyZodSchema = external_exports.object({
  id: external_exports.number(),
  schema: external_exports.string(),
  table: external_exports.string(),
  table_id: external_exports.number(),
  name: external_exports.string(),
  action: external_exports.union([external_exports.literal("PERMISSIVE"), external_exports.literal("RESTRICTIVE")]),
  roles: external_exports.array(external_exports.string()),
  command: external_exports.union([
    external_exports.literal("SELECT"),
    external_exports.literal("INSERT"),
    external_exports.literal("UPDATE"),
    external_exports.literal("DELETE"),
    external_exports.literal("ALL")
  ]),
  definition: external_exports.union([external_exports.string(), external_exports.null()]),
  check: external_exports.union([external_exports.string(), external_exports.null()])
}).passthrough();
var PolicyArrayZodSchema = external_exports.array(PolicyZodSchema);
var PolicyOptionalZodSchema = external_exports.optional(PolicyZodSchema);

// packages/domain/src/entities/datasource-meta/publications.type.ts
var PublicationTableZodSchema = external_exports.object({
  id: external_exports.number().optional(),
  name: external_exports.string(),
  schema: external_exports.string()
}).passthrough();
var PublicationZodSchema = external_exports.object({
  id: external_exports.number(),
  name: external_exports.string(),
  owner: external_exports.string(),
  publish_insert: external_exports.boolean(),
  publish_update: external_exports.boolean(),
  publish_delete: external_exports.boolean(),
  publish_truncate: external_exports.boolean(),
  tables: external_exports.array(PublicationTableZodSchema).nullable()
}).passthrough();
var PublicationArrayZodSchema = external_exports.array(PublicationZodSchema);
var PublicationOptionalZodSchema = external_exports.optional(PublicationZodSchema);

// packages/domain/src/entities/datasource-meta/roles.type.ts
var RoleZodSchema = external_exports.object({
  id: external_exports.number(),
  name: external_exports.string(),
  isSuperuser: external_exports.boolean(),
  canCreateDb: external_exports.boolean(),
  canCreateRole: external_exports.boolean(),
  inheritRole: external_exports.boolean(),
  canLogin: external_exports.boolean(),
  isReplicationRole: external_exports.boolean(),
  canBypassRls: external_exports.boolean(),
  activeConnections: external_exports.number(),
  connectionLimit: external_exports.number(),
  validUntil: external_exports.union([external_exports.string(), external_exports.null()]),
  config: external_exports.record(external_exports.string(), external_exports.string())
}).passthrough();
var RoleArrayZodSchema = external_exports.array(RoleZodSchema);
var RoleOptionalZodSchema = external_exports.optional(RoleZodSchema);

// packages/domain/src/entities/datasource-meta/table-privileges.type.ts
var TablePrivilegesZodSchema = external_exports.object({
  relation_id: external_exports.number(),
  schema: external_exports.string(),
  name: external_exports.string(),
  kind: external_exports.union([
    external_exports.literal("table"),
    external_exports.literal("view"),
    external_exports.literal("materialized_view"),
    external_exports.literal("foreign_table"),
    external_exports.literal("partitioned_table")
  ]),
  privileges: external_exports.array(
    external_exports.object({
      grantor: external_exports.string(),
      grantee: external_exports.string(),
      privilege_type: external_exports.union([
        external_exports.literal("SELECT"),
        external_exports.literal("INSERT"),
        external_exports.literal("UPDATE"),
        external_exports.literal("DELETE"),
        external_exports.literal("TRUNCATE"),
        external_exports.literal("REFERENCES"),
        external_exports.literal("TRIGGER"),
        external_exports.literal("MAINTAIN")
      ]),
      is_grantable: external_exports.boolean()
    })
  )
}).passthrough();
var TablePrivilegesArrayZodSchema = external_exports.array(TablePrivilegesZodSchema);
var TablePrivilegesOptionalZodSchema = external_exports.optional(
  TablePrivilegesZodSchema
);

// packages/domain/src/entities/datasource-meta/triggers.type.ts
var TriggerZodSchema = external_exports.object({
  id: external_exports.number(),
  table_id: external_exports.number(),
  name: external_exports.string(),
  table: external_exports.string(),
  schema: external_exports.string(),
  events: external_exports.array(external_exports.string()),
  function_name: external_exports.string(),
  function_schema: external_exports.string().optional(),
  condition: external_exports.string().nullable().optional(),
  timing: external_exports.string().optional(),
  orientation: external_exports.string().optional(),
  function_args: external_exports.array(external_exports.string()).optional()
}).passthrough();
var TriggerArrayZodSchema = external_exports.array(TriggerZodSchema);
var TriggerOptionalZodSchema = external_exports.optional(TriggerZodSchema);

// packages/domain/src/entities/datasource-meta/types.type.ts
var TypeZodSchema = external_exports.object({
  id: external_exports.number(),
  name: external_exports.string(),
  schema: external_exports.string(),
  format: external_exports.string(),
  enums: external_exports.array(external_exports.string()),
  attributes: external_exports.array(
    external_exports.object({
      name: external_exports.string(),
      type_id: external_exports.number()
    })
  ),
  comment: external_exports.string().nullable()
}).passthrough();
var TypeArrayZodSchema = external_exports.array(TypeZodSchema);
var TypeOptionalZodSchema = external_exports.optional(TypeZodSchema);

// packages/domain/src/entities/datasource-meta/config.type.ts
var ConfigZodSchema = external_exports.object({
  name: external_exports.string(),
  setting: external_exports.string(),
  category: external_exports.string(),
  group: external_exports.string(),
  subgroup: external_exports.string(),
  unit: external_exports.string().nullable(),
  short_desc: external_exports.string(),
  extra_desc: external_exports.string().nullable(),
  context: external_exports.string(),
  vartype: external_exports.string(),
  source: external_exports.string(),
  min_val: external_exports.string().nullable(),
  max_val: external_exports.string().nullable(),
  enumvals: external_exports.array(external_exports.string()).nullable(),
  boot_val: external_exports.string().nullable(),
  reset_val: external_exports.string().nullable(),
  sourcefile: external_exports.string().nullable(),
  sourceline: external_exports.number().nullable(),
  pending_restart: external_exports.boolean()
}).passthrough();
var ConfigArrayZodSchema = external_exports.array(ConfigZodSchema);
var ConfigOptionalZodSchema = external_exports.optional(ConfigZodSchema);

// packages/domain/src/entities/datasource-meta/metadata.type.ts
var DatasourceMetadataZodSchema = external_exports.object({
  version: external_exports.string(),
  driver: external_exports.string(),
  schemas: SchemaArrayZod,
  tables: TableArrayZodSchema,
  columns: ColumnArrayZodSchema,
  views: ViewArrayZodSchema.optional(),
  functions: FunctionArrayZodSchema.optional(),
  indexes: IndexArrayZodSchema.optional(),
  triggers: TriggerArrayZodSchema.optional(),
  materializedViews: MaterializedViewArrayZodSchema.optional(),
  types: TypeArrayZodSchema.optional(),
  foreignTables: ForeignTableArrayZodSchema.optional(),
  // Optional capabilities
  policies: PolicyArrayZodSchema.optional(),
  tablePrivileges: TablePrivilegesArrayZodSchema.optional(),
  columnPrivileges: ColumnPrivilegesArrayZodSchema.optional(),
  // Optional vendor/deployment components
  config: ConfigArrayZodSchema.optional(),
  publications: PublicationArrayZodSchema.optional(),
  roles: RoleArrayZodSchema.optional(),
  extensions: DatasourceExtensionArrayZod.optional()
}).passthrough();

// packages/domain/src/entities/datasource-meta/resultset.type.ts
var ColumnTypeSchema = external_exports.enum([
  "string",
  "number",
  "integer",
  "boolean",
  "date",
  "datetime",
  "timestamp",
  "time",
  "json",
  "jsonb",
  "array",
  "blob",
  "binary",
  "uuid",
  "decimal",
  "float",
  "null",
  "unknown"
]);
var DatasourceResultStatSchema = external_exports.object({
  rowsAffected: external_exports.number().int().min(0).describe("Number of rows affected by the query"),
  rowsRead: external_exports.number().int().min(0).nullable().describe("Number of rows read during query execution"),
  rowsWritten: external_exports.number().int().min(0).nullable().describe("Number of rows written during query execution"),
  queryDurationMs: external_exports.number().min(0).nullable().describe("Query execution duration in milliseconds")
}).passthrough();
var ColumnHeaderSchema = external_exports.object({
  /**
   * The key of row data that this column represents.
   */
  name: external_exports.string().min(1).describe("The key of row data that this column represents"),
  /**
   * The display name of the column. This is the name that should be used when displaying the column to the user.
   */
  displayName: external_exports.string().min(1).describe("The display name of the column"),
  /**
   * The original type of the column returned from database driver.
   * This is database-specific (e.g., 'VARCHAR', 'INTEGER', 'TIMESTAMP', 'BIGINT').
   */
  originalType: external_exports.string().nullable().describe("The original database-specific type of the column"),
  /**
   * Normalized type hint for client rendering and visualization.
   * Frontend should use this to adapt visualization (e.g., date pickers for dates, number formatting for numbers).
   */
  type: ColumnTypeSchema.optional().describe(
    "Normalized type hint for frontend visualization"
  ),
  /**
   * Database name or schema name
   */
  schema: external_exports.string().optional().describe("Database name or schema name"),
  /**
   * The actual table name
   */
  table: external_exports.string().optional().describe("The actual table name"),
  /**
   * The original column name returned from database driver.
   */
  originalName: external_exports.string().optional().describe("The original column name returned from database driver"),
  /**
   * Indicate if this column is a primary key.
   */
  primaryKey: external_exports.boolean().optional().describe("Indicate if this column is a primary key"),
  /**
   * The column id in the table. Useful for Postgres and other databases that expose column OIDs.
   */
  columnId: external_exports.number().int().optional().describe("The column id in the table (useful for Postgres OIDs)"),
  /**
   * The table id in the database. Useful for Postgres and other databases that expose table OIDs.
   */
  tableId: external_exports.number().int().optional().describe("The table id in the database (useful for Postgres OIDs)")
}).passthrough();
var DatasourceRowSchema = external_exports.record(external_exports.unknown());
var DatasourceResultSetZodSchema = external_exports.object({
  rows: external_exports.array(DatasourceRowSchema).describe("Array of result rows"),
  columns: external_exports.array(ColumnHeaderSchema).describe("Array of column metadata"),
  stat: DatasourceResultStatSchema.describe("Query execution statistics")
}).passthrough();

// packages/extensions/pglite/dist/driver.js
var ConfigSchema = external_exports.object({
  database: external_exports.string().default("playground").describe("Database name")
});
function makePGliteDriver(context) {
  const dbMap = /* @__PURE__ */ new Map();
  const getDb = async (config) => {
    const key = config.database || "playground";
    if (!dbMap.has(key)) {
      const db = new We2(`idb://${key}`);
      await db.waitReady;
      dbMap.set(key, db);
    }
    return dbMap.get(key);
  };
  return {
    async testConnection(config) {
      const parsed = ConfigSchema.parse(config);
      const db = await getDb(parsed);
      await db.query("SELECT 1");
      context.logger?.info?.("pglite: testConnection ok");
    },
    async metadata(config) {
      const parsed = ConfigSchema.parse(config);
      const db = await getDb(parsed);
      const tablesResult = await db.query(`
        SELECT 
          table_schema,
          table_name,
          column_name,
          data_type,
          ordinal_position,
          is_nullable,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_schema, table_name, ordinal_position;
      `);
      let tableId = 1;
      const tableMap = /* @__PURE__ */ new Map();
      const buildColumn = (schema, table, name2, ordinal, dataType, nullable, charMaxLength, numericPrecision, numericScale) => {
        let format = dataType;
        if (charMaxLength) {
          format = `${dataType}(${charMaxLength})`;
        } else if (numericPrecision !== null && numericScale !== null) {
          format = `${dataType}(${numericPrecision},${numericScale})`;
        } else if (numericPrecision !== null) {
          format = `${dataType}(${numericPrecision})`;
        }
        return {
          id: `${schema}.${table}.${name2}`,
          table_id: 0,
          schema,
          table,
          name: name2,
          ordinal_position: ordinal,
          data_type: dataType,
          format,
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: nullable === "YES",
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null
        };
      };
      for (const row of tablesResult.rows) {
        const key = `${row.table_schema}.${row.table_name}`;
        if (!tableMap.has(key)) {
          tableMap.set(key, {
            id: tableId++,
            schema: row.table_schema,
            name: row.table_name,
            columns: []
          });
        }
        const entry = tableMap.get(key);
        entry.columns.push(buildColumn(row.table_schema, row.table_name, row.column_name, row.ordinal_position, row.data_type, row.is_nullable, row.character_maximum_length, row.numeric_precision, row.numeric_scale));
      }
      const tables = Array.from(tableMap.values()).map((table) => ({
        id: table.id,
        schema: table.schema,
        name: table.name,
        rls_enabled: false,
        rls_forced: false,
        bytes: 0,
        size: "0",
        live_rows_estimate: 0,
        dead_rows_estimate: 0,
        comment: null,
        primary_keys: [],
        relationships: []
      }));
      const columns = Array.from(tableMap.values()).flatMap((table) => table.columns.map((column) => ({
        ...column,
        table_id: table.id
      })));
      const schemas = Array.from(new Set(Array.from(tableMap.values()).map((table) => table.schema))).map((name2, idx) => ({
        id: idx + 1,
        name: name2,
        owner: "unknown"
      }));
      return DatasourceMetadataZodSchema.parse({
        version: "0.0.1",
        driver: "pglite",
        schemas,
        tables,
        columns
      });
    },
    async query(sql, config) {
      const parsed = ConfigSchema.parse(config);
      const db = await getDb(parsed);
      const startTime = performance.now();
      try {
        const result = await db.query(sql);
        const endTime = performance.now();
        const columns = result.fields.map((field) => ({
          name: field.name,
          displayName: field.name,
          originalType: field.dataTypeID?.toString() ?? null
        }));
        const rows = result.rows.map((row) => {
          if (Array.isArray(row)) {
            const rowData = {};
            result.fields.forEach((field, index) => {
              rowData[field.name] = row[index];
            });
            return rowData;
          }
          return row;
        });
        return {
          columns,
          rows,
          stat: {
            rowsAffected: result.affectedRows ?? 0,
            rowsRead: rows.length,
            rowsWritten: result.affectedRows ?? 0,
            queryDurationMs: endTime - startTime
          }
        };
      } catch (error) {
        throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    async close() {
      for (const db of dbMap.values()) {
        await db.close();
      }
      dbMap.clear();
      context.logger?.info?.("pglite: closed");
    }
  };
}
var driverFactory = makePGliteDriver;
var driver_default = driverFactory;
export {
  driver_default as default,
  driverFactory,
  makePGliteDriver
};
/*! Bundled license information:

reflect-metadata/Reflect.js:
  (*! *****************************************************************************
  Copyright (C) Microsoft. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0
  
  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.
  
  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** *)
*/
