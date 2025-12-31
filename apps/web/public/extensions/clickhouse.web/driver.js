
// This file is bundled for browser use
// All dependencies including @qwery/extensions-sdk and @qwery/domain are bundled

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/client.js
var require_client = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/client.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ClickHouseClient = void 0;
    var client_common_1 = require_dist();
    var ClickHouseClient = class {
      constructor(config) {
        Object.defineProperty(this, "connectionParams", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "connection", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "makeResultSet", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "valuesEncoder", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "closeStream", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "sessionId", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.connectionParams = getConnectionParams(config);
        this.sessionId = config.session_id;
        validateConnectionParams(this.connectionParams);
        this.connection = config.impl.make_connection(this.connectionParams);
        this.makeResultSet = config.impl.make_result_set;
        this.valuesEncoder = config.impl.values_encoder;
        this.closeStream = config.impl.close_stream;
      }
      getQueryParams(params) {
        return {
          clickhouse_settings: {
            ...this.connectionParams.clickhouse_settings,
            ...params.clickhouse_settings
          },
          query_params: params.query_params,
          abort_signal: params.abort_signal,
          query_id: params.query_id,
          session_id: this.sessionId
        };
      }
      /**
       * Used for most statements that can have a response, such as SELECT.
       * FORMAT clause should be specified separately via {@link QueryParams.format} (default is JSON)
       * Consider using {@link ClickHouseClient.insert} for data insertion,
       * or {@link ClickHouseClient.command} for DDLs.
       */
      async query(params) {
        const format = params.format ?? "JSON";
        const query = formatQuery(params.query, format);
        const { stream, query_id } = await this.connection.query({
          query,
          ...this.getQueryParams(params)
        });
        return this.makeResultSet(stream, format, query_id);
      }
      /**
       * It should be used for statements that do not have any output,
       * when the format clause is not applicable, or when you are not interested in the response at all.
       * Response stream is destroyed immediately as we do not expect useful information there.
       * Examples of such statements are DDLs or custom inserts.
       * If you are interested in the response data, consider using {@link ClickHouseClient.exec}
       */
      async command(params) {
        const { stream, query_id, summary } = await this.exec(params);
        await this.closeStream(stream);
        return { query_id, summary };
      }
      /**
       * Similar to {@link ClickHouseClient.command}, but for the cases where the output is expected,
       * but format clause is not applicable. The caller of this method is expected to consume the stream,
       * otherwise, the request will eventually be timed out.
       */
      async exec(params) {
        const query = removeTrailingSemi(params.query.trim());
        return await this.connection.exec({
          query,
          ...this.getQueryParams(params)
        });
      }
      /**
       * The primary method for data insertion. It is recommended to avoid arrays in case of large inserts
       * to reduce application memory consumption and consider streaming for most of such use cases.
       * As the insert operation does not provide any output, the response stream is immediately destroyed.
       * In case of a custom insert operation, such as, for example, INSERT FROM SELECT,
       * consider using {@link ClickHouseClient.command}, passing the entire raw query there (including FORMAT clause).
       */
      async insert(params) {
        if (Array.isArray(params.values) && params.values.length === 0) {
          return { executed: false, query_id: "" };
        }
        const format = params.format || "JSONCompactEachRow";
        this.valuesEncoder.validateInsertValues(params.values, format);
        const query = getInsertQuery(params, format);
        const result = await this.connection.insert({
          query,
          values: this.valuesEncoder.encodeValues(params.values, format),
          ...this.getQueryParams(params)
        });
        return { ...result, executed: true };
      }
      /**
       * Health-check request. It does not throw if an error occurs -
       * the error is returned inside the result object.
       */
      async ping() {
        return await this.connection.ping();
      }
      /**
       * Shuts down the underlying connection.
       * This method should ideally be called only once per application lifecycle,
       * for example, during the graceful shutdown phase.
       */
      async close() {
        return await this.connection.close();
      }
    };
    exports.ClickHouseClient = ClickHouseClient;
    function formatQuery(query, format) {
      query = query.trim();
      query = removeTrailingSemi(query);
      return query + " \nFORMAT " + format;
    }
    function removeTrailingSemi(query) {
      let lastNonSemiIdx = query.length;
      for (let i = lastNonSemiIdx; i > 0; i--) {
        if (query[i - 1] !== ";") {
          lastNonSemiIdx = i;
          break;
        }
      }
      if (lastNonSemiIdx !== query.length) {
        return query.slice(0, lastNonSemiIdx);
      }
      return query;
    }
    function validateConnectionParams({ url }) {
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error(`Only http(s) protocol is supported, but given: [${url.protocol}]`);
      }
    }
    function createUrl(host) {
      try {
        return new URL(host);
      } catch (err) {
        throw new Error('Configuration parameter "host" contains malformed url.');
      }
    }
    function getConnectionParams(config) {
      return {
        application_id: config.application,
        url: createUrl(config.host ?? "http://localhost:8123"),
        request_timeout: config.request_timeout ?? 3e5,
        max_open_connections: config.max_open_connections ?? Infinity,
        compression: {
          decompress_response: config.compression?.response ?? true,
          compress_request: config.compression?.request ?? false
        },
        username: config.username ?? "default",
        password: config.password ?? "",
        database: config.database ?? "default",
        clickhouse_settings: config.clickhouse_settings ?? {},
        logWriter: new client_common_1.LogWriter(config?.log?.LoggerClass ? new config.log.LoggerClass() : new client_common_1.DefaultLogger(), config.log?.level),
        additional_headers: config.additional_headers
      };
    }
    function isInsertColumnsExcept(obj) {
      return obj !== void 0 && obj !== null && typeof obj === "object" && // Avoiding ESLint no-prototype-builtins error
      Object.prototype.hasOwnProperty.call(obj, "except");
    }
    function getInsertQuery(params, format) {
      let columnsPart = "";
      if (params.columns !== void 0) {
        if (Array.isArray(params.columns) && params.columns.length > 0) {
          columnsPart = ` (${params.columns.join(", ")})`;
        } else if (isInsertColumnsExcept(params.columns) && params.columns.except.length > 0) {
          columnsPart = ` (* EXCEPT (${params.columns.except.join(", ")}))`;
        }
      }
      return `INSERT INTO ${params.table.trim()}${columnsPart} FORMAT ${format}`;
    }
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/error/parse_error.js
var require_parse_error = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/error/parse_error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseError = exports.ClickHouseError = void 0;
    var errorRe = /(Code|Error): (?<code>\d+).*Exception: (?<message>.+)\((?<type>(?=.+[A-Z]{3})[A-Z0-9_]+?)\)/s;
    var ClickHouseError = class _ClickHouseError extends Error {
      constructor({ message, code, type }) {
        super(message);
        Object.defineProperty(this, "code", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "type", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.code = code;
        this.type = type;
        Object.setPrototypeOf(this, _ClickHouseError.prototype);
      }
    };
    exports.ClickHouseError = ClickHouseError;
    function parseError(input) {
      const inputIsError = input instanceof Error;
      const message = inputIsError ? input.message : input;
      const match = message.match(errorRe);
      const groups = match?.groups;
      if (groups) {
        return new ClickHouseError(groups);
      } else {
        return inputIsError ? input : new Error(input);
      }
    }
    exports.parseError = parseError;
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/error/index.js
var require_error = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/error/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_parse_error(), exports);
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/logger.js
var require_logger = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/logger.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ClickHouseLogLevel = exports.LogWriter = exports.DefaultLogger = void 0;
    var DefaultLogger = class {
      trace({ module: module2, message, args }) {
        console.trace(formatMessage({ module: module2, message }), args);
      }
      debug({ module: module2, message, args }) {
        console.debug(formatMessage({ module: module2, message }), args);
      }
      info({ module: module2, message, args }) {
        console.info(formatMessage({ module: module2, message }), args);
      }
      warn({ module: module2, message, args }) {
        console.warn(formatMessage({ module: module2, message }), args);
      }
      error({ module: module2, message, args, err }) {
        console.error(formatMessage({ module: module2, message }), args, err);
      }
    };
    exports.DefaultLogger = DefaultLogger;
    var LogWriter = class {
      constructor(logger, logLevel) {
        Object.defineProperty(this, "logger", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: logger
        });
        Object.defineProperty(this, "logLevel", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.logLevel = logLevel ?? ClickHouseLogLevel.OFF;
        this.info({
          module: "Logger",
          message: `Log level is set to ${ClickHouseLogLevel[this.logLevel]}`
        });
      }
      trace(params) {
        if (this.logLevel <= ClickHouseLogLevel.TRACE) {
          this.logger.trace(params);
        }
      }
      debug(params) {
        if (this.logLevel <= ClickHouseLogLevel.DEBUG) {
          this.logger.debug(params);
        }
      }
      info(params) {
        if (this.logLevel <= ClickHouseLogLevel.INFO) {
          this.logger.info(params);
        }
      }
      warn(params) {
        if (this.logLevel <= ClickHouseLogLevel.WARN) {
          this.logger.warn(params);
        }
      }
      error(params) {
        if (this.logLevel <= ClickHouseLogLevel.ERROR) {
          this.logger.error(params);
        }
      }
    };
    exports.LogWriter = LogWriter;
    var ClickHouseLogLevel;
    (function(ClickHouseLogLevel2) {
      ClickHouseLogLevel2[ClickHouseLogLevel2["TRACE"] = 0] = "TRACE";
      ClickHouseLogLevel2[ClickHouseLogLevel2["DEBUG"] = 1] = "DEBUG";
      ClickHouseLogLevel2[ClickHouseLogLevel2["INFO"] = 2] = "INFO";
      ClickHouseLogLevel2[ClickHouseLogLevel2["WARN"] = 3] = "WARN";
      ClickHouseLogLevel2[ClickHouseLogLevel2["ERROR"] = 4] = "ERROR";
      ClickHouseLogLevel2[ClickHouseLogLevel2["OFF"] = 127] = "OFF";
    })(ClickHouseLogLevel = exports.ClickHouseLogLevel || (exports.ClickHouseLogLevel = {}));
    function formatMessage({ module: module2, message }) {
      return `[@clickhouse/client][${module2}] ${message}`;
    }
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/settings.js
var require_settings = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SettingsMap = void 0;
    var SettingsMap = class {
      constructor(record) {
        Object.defineProperty(this, "record", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: record
        });
      }
      toString() {
        return `{${Object.entries(this.record).map(([k, v]) => `'${k}':'${v}'`).join(",")}}`;
      }
      static from(record) {
        return new this(record);
      }
    };
    exports.SettingsMap = SettingsMap;
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/data_formatter/formatter.js
var require_formatter = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/data_formatter/formatter.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.encodeJSON = exports.decode = exports.validateStreamFormat = exports.isSupportedRawFormat = void 0;
    var streamableJSONFormats = [
      "JSONEachRow",
      "JSONStringsEachRow",
      "JSONCompactEachRow",
      "JSONCompactStringsEachRow",
      "JSONCompactEachRowWithNames",
      "JSONCompactEachRowWithNamesAndTypes",
      "JSONCompactStringsEachRowWithNames",
      "JSONCompactStringsEachRowWithNamesAndTypes"
    ];
    var singleDocumentJSONFormats = [
      "JSON",
      "JSONStrings",
      "JSONCompact",
      "JSONCompactStrings",
      "JSONColumnsWithMetadata",
      "JSONObjectEachRow"
    ];
    var supportedJSONFormats = [
      ...singleDocumentJSONFormats,
      ...streamableJSONFormats
    ];
    var supportedRawFormats = [
      "CSV",
      "CSVWithNames",
      "CSVWithNamesAndTypes",
      "TabSeparated",
      "TabSeparatedRaw",
      "TabSeparatedWithNames",
      "TabSeparatedWithNamesAndTypes",
      "CustomSeparated",
      "CustomSeparatedWithNames",
      "CustomSeparatedWithNamesAndTypes",
      "Parquet"
    ];
    var streamableFormat = [
      ...streamableJSONFormats,
      ...supportedRawFormats
    ];
    function isNotStreamableJSONFamily(format) {
      return singleDocumentJSONFormats.includes(format);
    }
    function isStreamableJSONFamily(format) {
      return streamableJSONFormats.includes(format);
    }
    function isSupportedRawFormat(dataFormat) {
      return supportedRawFormats.includes(dataFormat);
    }
    exports.isSupportedRawFormat = isSupportedRawFormat;
    function validateStreamFormat(format) {
      if (!streamableFormat.includes(format)) {
        throw new Error(`${format} format is not streamable. Streamable formats: ${streamableFormat.join(",")}`);
      }
      return true;
    }
    exports.validateStreamFormat = validateStreamFormat;
    function decode(text, format) {
      if (isNotStreamableJSONFamily(format)) {
        return JSON.parse(text);
      }
      if (isStreamableJSONFamily(format)) {
        return text.split("\n").filter(Boolean).map((l) => decode(l, "JSON"));
      }
      if (isSupportedRawFormat(format)) {
        throw new Error(`Cannot decode ${format} to JSON`);
      }
      throw new Error(`The client does not support [${format}] format decoding.`);
    }
    exports.decode = decode;
    function encodeJSON(value, format) {
      if (supportedJSONFormats.includes(format)) {
        return JSON.stringify(value) + "\n";
      }
      throw new Error(`The client does not support JSON encoding in [${format}] format.`);
    }
    exports.encodeJSON = encodeJSON;
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/utils/connection.js
var require_connection = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/utils/connection.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isSuccessfulResponse = exports.withHttpSettings = exports.withCompressionHeaders = void 0;
    function withCompressionHeaders({ headers, compress_request, decompress_response }) {
      return {
        ...headers,
        ...decompress_response ? { "Accept-Encoding": "gzip" } : {},
        ...compress_request ? { "Content-Encoding": "gzip" } : {}
      };
    }
    exports.withCompressionHeaders = withCompressionHeaders;
    function withHttpSettings(clickhouse_settings, compression) {
      return {
        ...compression ? {
          enable_http_compression: 1
        } : {},
        ...clickhouse_settings
      };
    }
    exports.withHttpSettings = withHttpSettings;
    function isSuccessfulResponse(statusCode) {
      return Boolean(statusCode && 200 <= statusCode && statusCode < 300);
    }
    exports.isSuccessfulResponse = isSuccessfulResponse;
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/utils/string.js
var require_string = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/utils/string.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.replaceAll = void 0;
    function replaceAll(input, replace_char, new_char) {
      return input.split(replace_char).join(new_char);
    }
    exports.replaceAll = replaceAll;
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/utils/url.js
var require_url = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/utils/url.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.toSearchParams = exports.transformUrl = void 0;
    var data_formatter_1 = require_data_formatter();
    function transformUrl({ url, pathname, searchParams }) {
      const newUrl = new URL(url);
      if (pathname) {
        if (newUrl.pathname === "/") {
          newUrl.pathname = pathname;
        } else {
          newUrl.pathname += pathname;
        }
      }
      if (searchParams) {
        newUrl.search = searchParams?.toString();
      }
      return newUrl;
    }
    exports.transformUrl = transformUrl;
    function toSearchParams({ database, query, query_params, clickhouse_settings, session_id, query_id }) {
      if (clickhouse_settings === void 0 && query_params === void 0 && query === void 0 && database === "default") {
        return;
      }
      const params = new URLSearchParams();
      if (query_params !== void 0) {
        for (const [key, value] of Object.entries(query_params)) {
          params.set(`param_${key}`, (0, data_formatter_1.formatQueryParams)(value));
        }
      }
      if (clickhouse_settings !== void 0) {
        for (const [key, value] of Object.entries(clickhouse_settings)) {
          if (value !== void 0) {
            params.set(key, (0, data_formatter_1.formatQuerySettings)(value));
          }
        }
      }
      if (database !== "default") {
        params.set("database", database);
      }
      if (query) {
        params.set("query", query);
      }
      if (session_id) {
        params.set("session_id", session_id);
      }
      if (query_id) {
        params.set("query_id", query_id);
      }
      return params;
    }
    exports.toSearchParams = toSearchParams;
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/utils/index.js
var require_utils = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/utils/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_connection(), exports);
    __exportStar(require_string(), exports);
    __exportStar(require_url(), exports);
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/data_formatter/format_query_params.js
var require_format_query_params = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/data_formatter/format_query_params.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatQueryParams = void 0;
    var utils_1 = require_utils();
    function formatQueryParams(value, wrapStringInQuotes = false) {
      if (value === null || value === void 0)
        return "\\N";
      if (Number.isNaN(value))
        return "nan";
      if (value === Number.POSITIVE_INFINITY)
        return "+inf";
      if (value === Number.NEGATIVE_INFINITY)
        return "-inf";
      if (typeof value === "number")
        return String(value);
      if (typeof value === "boolean")
        return value ? "1" : "0";
      if (typeof value === "string") {
        const escapedValue = (0, utils_1.replaceAll)((0, utils_1.replaceAll)(value, `\\`, `\\\\`), `'`, `\\'`);
        return wrapStringInQuotes ? `'${escapedValue}'` : escapedValue;
      }
      if (Array.isArray(value)) {
        const formatted = value.map((v) => formatQueryParams(v, true));
        return `[${formatted.join(",")}]`;
      }
      if (value instanceof Date) {
        const unixTimestamp = Math.floor(value.getTime() / 1e3).toString().padStart(10, "0");
        const milliseconds = value.getUTCMilliseconds();
        return milliseconds === 0 ? unixTimestamp : `${unixTimestamp}.${milliseconds.toString().padStart(3, "0")}`;
      }
      if (typeof value === "object") {
        const formatted = [];
        for (const [key, val] of Object.entries(value)) {
          formatted.push(`${formatQueryParams(key, true)}:${formatQueryParams(val, true)}`);
        }
        return `{${formatted.join(",")}}`;
      }
      throw new Error(`Unsupported value in query parameters: [${value}].`);
    }
    exports.formatQueryParams = formatQueryParams;
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/data_formatter/format_query_settings.js
var require_format_query_settings = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/data_formatter/format_query_settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatQuerySettings = void 0;
    var settings_1 = require_settings();
    function formatQuerySettings(value) {
      if (typeof value === "boolean")
        return value ? "1" : "0";
      if (typeof value === "number")
        return String(value);
      if (typeof value === "string")
        return value;
      if (value instanceof settings_1.SettingsMap) {
        return value.toString();
      }
      throw new Error(`Unsupported value in query settings: [${value}].`);
    }
    exports.formatQuerySettings = formatQuerySettings;
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/data_formatter/index.js
var require_data_formatter = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/data_formatter/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatQuerySettings = exports.formatQueryParams = void 0;
    __exportStar(require_formatter(), exports);
    var format_query_params_1 = require_format_query_params();
    Object.defineProperty(exports, "formatQueryParams", { enumerable: true, get: function() {
      return format_query_params_1.formatQueryParams;
    } });
    var format_query_settings_1 = require_format_query_settings();
    Object.defineProperty(exports, "formatQuerySettings", { enumerable: true, get: function() {
      return format_query_settings_1.formatQuerySettings;
    } });
  }
});

// node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-common@0.2.10/node_modules/@clickhouse/client-common/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatQueryParams = exports.formatQuerySettings = exports.parseError = exports.DefaultLogger = exports.LogWriter = exports.withHttpSettings = exports.transformUrl = exports.toSearchParams = exports.isSuccessfulResponse = exports.withCompressionHeaders = exports.validateStreamFormat = exports.decode = exports.isSupportedRawFormat = exports.encodeJSON = exports.SettingsMap = exports.ClickHouseLogLevel = exports.ClickHouseError = exports.ClickHouseClient = void 0;
    var client_1 = require_client();
    Object.defineProperty(exports, "ClickHouseClient", { enumerable: true, get: function() {
      return client_1.ClickHouseClient;
    } });
    var error_1 = require_error();
    Object.defineProperty(exports, "ClickHouseError", { enumerable: true, get: function() {
      return error_1.ClickHouseError;
    } });
    var logger_1 = require_logger();
    Object.defineProperty(exports, "ClickHouseLogLevel", { enumerable: true, get: function() {
      return logger_1.ClickHouseLogLevel;
    } });
    var settings_1 = require_settings();
    Object.defineProperty(exports, "SettingsMap", { enumerable: true, get: function() {
      return settings_1.SettingsMap;
    } });
    var data_formatter_1 = require_data_formatter();
    Object.defineProperty(exports, "encodeJSON", { enumerable: true, get: function() {
      return data_formatter_1.encodeJSON;
    } });
    Object.defineProperty(exports, "isSupportedRawFormat", { enumerable: true, get: function() {
      return data_formatter_1.isSupportedRawFormat;
    } });
    Object.defineProperty(exports, "decode", { enumerable: true, get: function() {
      return data_formatter_1.decode;
    } });
    Object.defineProperty(exports, "validateStreamFormat", { enumerable: true, get: function() {
      return data_formatter_1.validateStreamFormat;
    } });
    var utils_1 = require_utils();
    Object.defineProperty(exports, "withCompressionHeaders", { enumerable: true, get: function() {
      return utils_1.withCompressionHeaders;
    } });
    Object.defineProperty(exports, "isSuccessfulResponse", { enumerable: true, get: function() {
      return utils_1.isSuccessfulResponse;
    } });
    Object.defineProperty(exports, "toSearchParams", { enumerable: true, get: function() {
      return utils_1.toSearchParams;
    } });
    Object.defineProperty(exports, "transformUrl", { enumerable: true, get: function() {
      return utils_1.transformUrl;
    } });
    Object.defineProperty(exports, "withHttpSettings", { enumerable: true, get: function() {
      return utils_1.withHttpSettings;
    } });
    var logger_2 = require_logger();
    Object.defineProperty(exports, "LogWriter", { enumerable: true, get: function() {
      return logger_2.LogWriter;
    } });
    Object.defineProperty(exports, "DefaultLogger", { enumerable: true, get: function() {
      return logger_2.DefaultLogger;
    } });
    var error_2 = require_error();
    Object.defineProperty(exports, "parseError", { enumerable: true, get: function() {
      return error_2.parseError;
    } });
    var data_formatter_2 = require_data_formatter();
    Object.defineProperty(exports, "formatQuerySettings", { enumerable: true, get: function() {
      return data_formatter_2.formatQuerySettings;
    } });
    Object.defineProperty(exports, "formatQueryParams", { enumerable: true, get: function() {
      return data_formatter_2.formatQueryParams;
    } });
  }
});

// node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/utils/stream.js
var require_stream = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/utils/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getAsText = exports.isStream = void 0;
    function isStream(obj) {
      return obj !== null && obj !== void 0 && typeof obj.pipeThrough === "function";
    }
    exports.isStream = isStream;
    async function getAsText(stream) {
      let result = "";
      let isDone = false;
      const textDecoder = new TextDecoder();
      const reader = stream.getReader();
      while (!isDone) {
        const { done, value } = await reader.read();
        result += textDecoder.decode(value, { stream: true });
        isDone = done;
      }
      result += textDecoder.decode();
      return result;
    }
    exports.getAsText = getAsText;
  }
});

// node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/utils/encoder.js
var require_encoder = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/utils/encoder.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WebValuesEncoder = void 0;
    var client_common_1 = require_dist();
    var stream_1 = require_stream();
    var WebValuesEncoder = class {
      encodeValues(values, format) {
        throwIfStream(values);
        if (Array.isArray(values)) {
          return values.map((value) => (0, client_common_1.encodeJSON)(value, format)).join("");
        }
        if (typeof values === "object") {
          return (0, client_common_1.encodeJSON)(values, format);
        }
        throw new Error(`Cannot encode values of type ${typeof values} with ${format} format`);
      }
      validateInsertValues(values) {
        throwIfStream(values);
        if (!Array.isArray(values) && typeof values !== "object") {
          throw new Error(`Insert expected "values" to be an array or a JSON object, got: ${typeof values}`);
        }
      }
    };
    exports.WebValuesEncoder = WebValuesEncoder;
    function throwIfStream(values) {
      if ((0, stream_1.isStream)(values)) {
        throw new Error("Streaming is not supported for inserts in the web version of the client");
      }
    }
  }
});

// node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/utils/index.js
var require_utils2 = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/utils/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_stream(), exports);
    __exportStar(require_encoder(), exports);
  }
});

// node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/connection/web_connection.js
var require_web_connection = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/connection/web_connection.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WebConnection = void 0;
    var client_common_1 = require_dist();
    var utils_1 = require_utils2();
    var WebConnection = class {
      constructor(params) {
        Object.defineProperty(this, "params", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: params
        });
        Object.defineProperty(this, "defaultHeaders", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.defaultHeaders = {
          Authorization: `Basic ${btoa(`${params.username}:${params.password}`)}`,
          ...params?.additional_headers
        };
      }
      async query(params) {
        const query_id = getQueryId(params.query_id);
        const clickhouse_settings = (0, client_common_1.withHttpSettings)(params.clickhouse_settings, this.params.compression.decompress_response);
        const searchParams = (0, client_common_1.toSearchParams)({
          database: this.params.database,
          clickhouse_settings,
          query_params: params.query_params,
          session_id: params.session_id,
          query_id
        });
        const response = await this.request({
          values: params.query,
          params,
          searchParams
        });
        return {
          query_id,
          stream: response.body || new ReadableStream()
        };
      }
      async exec(params) {
        const query_id = getQueryId(params.query_id);
        const searchParams = (0, client_common_1.toSearchParams)({
          database: this.params.database,
          clickhouse_settings: params.clickhouse_settings,
          query_params: params.query_params,
          session_id: params.session_id,
          query_id
        });
        const response = await this.request({
          values: params.query,
          params,
          searchParams
        });
        return {
          stream: response.body || new ReadableStream(),
          query_id
        };
      }
      async insert(params) {
        const query_id = getQueryId(params.query_id);
        const searchParams = (0, client_common_1.toSearchParams)({
          database: this.params.database,
          clickhouse_settings: params.clickhouse_settings,
          query_params: params.query_params,
          query: params.query,
          session_id: params.session_id,
          query_id
        });
        const res = await this.request({
          values: params.values,
          params,
          searchParams
        });
        if (res.body !== null) {
          await res.text();
        }
        return {
          query_id
        };
      }
      async ping() {
        try {
          const response = await this.request({
            values: "SELECT 1 FORMAT CSV"
          });
          if (response.body !== null) {
            await response.body.cancel();
          }
          return { success: true };
        } catch (error) {
          if (error instanceof Error) {
            return {
              success: false,
              error
            };
          }
          throw error;
        }
      }
      async close() {
        return;
      }
      async request({ values, params, searchParams, pathname, method }) {
        const url = (0, client_common_1.transformUrl)({
          url: this.params.url,
          pathname,
          searchParams
        }).toString();
        const abortController = new AbortController();
        let isTimedOut = false;
        const timeout = setTimeout(() => {
          isTimedOut = true;
          abortController.abort();
        }, this.params.request_timeout);
        let isAborted2 = false;
        if (params?.abort_signal !== void 0) {
          params.abort_signal.onabort = () => {
            isAborted2 = true;
            abortController.abort();
          };
        }
        try {
          const headers = (0, client_common_1.withCompressionHeaders)({
            headers: this.defaultHeaders,
            compress_request: false,
            decompress_response: this.params.compression.decompress_response
          });
          const response = await fetch(url, {
            body: values,
            headers,
            keepalive: this.params.keep_alive.enabled,
            method: method ?? "POST",
            signal: abortController.signal
          });
          clearTimeout(timeout);
          if ((0, client_common_1.isSuccessfulResponse)(response.status)) {
            return response;
          } else {
            return Promise.reject((0, client_common_1.parseError)(await (0, utils_1.getAsText)(response.body || new ReadableStream())));
          }
        } catch (err) {
          clearTimeout(timeout);
          if (isAborted2) {
            return Promise.reject(new Error("The user aborted a request."));
          }
          if (isTimedOut) {
            return Promise.reject(new Error("Timeout error."));
          }
          if (err instanceof Error) {
            return Promise.reject((0, client_common_1.parseError)(err));
          }
          throw err;
        }
      }
    };
    exports.WebConnection = WebConnection;
    function getQueryId(query_id) {
      return query_id || crypto.randomUUID();
    }
  }
});

// node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/connection/index.js
var require_connection2 = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/connection/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_web_connection(), exports);
  }
});

// node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/result_set.js
var require_result_set = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/result_set.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ResultSet = void 0;
    var client_common_1 = require_dist();
    var utils_1 = require_utils2();
    var ResultSet = class {
      constructor(_stream, format, query_id) {
        Object.defineProperty(this, "_stream", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _stream
        });
        Object.defineProperty(this, "format", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: format
        });
        Object.defineProperty(this, "query_id", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: query_id
        });
        Object.defineProperty(this, "isAlreadyConsumed", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: false
        });
      }
      async text() {
        this.markAsConsumed();
        return (0, utils_1.getAsText)(this._stream);
      }
      async json() {
        const text = await this.text();
        return (0, client_common_1.decode)(text, this.format);
      }
      stream() {
        this.markAsConsumed();
        (0, client_common_1.validateStreamFormat)(this.format);
        let decodedChunk = "";
        const decoder = new TextDecoder("utf-8");
        const transform = new TransformStream({
          start() {
          },
          transform: (chunk, controller) => {
            if (chunk === null) {
              controller.terminate();
            }
            decodedChunk += decoder.decode(chunk);
            const rows = [];
            while (true) {
              const idx = decodedChunk.indexOf("\n");
              if (idx !== -1) {
                const text = decodedChunk.slice(0, idx);
                decodedChunk = decodedChunk.slice(idx + 1);
                rows.push({
                  text,
                  json() {
                    return (0, client_common_1.decode)(text, "JSON");
                  }
                });
              } else {
                if (rows.length) {
                  controller.enqueue(rows);
                }
                break;
              }
            }
          },
          flush() {
            decodedChunk = "";
          }
        });
        return this._stream.pipeThrough(transform, {
          preventClose: false,
          preventAbort: false,
          preventCancel: false
        });
      }
      async close() {
        this.markAsConsumed();
        await this._stream.cancel();
      }
      markAsConsumed() {
        if (this.isAlreadyConsumed) {
          throw new Error(streamAlreadyConsumedMessage);
        }
        this.isAlreadyConsumed = true;
      }
    };
    exports.ResultSet = ResultSet;
    var streamAlreadyConsumedMessage = "Stream has been already consumed";
  }
});

// node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/client.js
var require_client2 = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/client.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createClient = void 0;
    var client_common_1 = require_dist();
    var connection_1 = require_connection2();
    var result_set_1 = require_result_set();
    var utils_1 = require_utils2();
    function createClient2(config) {
      const keep_alive = {
        enabled: config?.keep_alive?.enabled ?? true
      };
      return new client_common_1.ClickHouseClient({
        impl: {
          make_connection: (params) => new connection_1.WebConnection({ ...params, keep_alive }),
          make_result_set: (stream, format, query_id) => new result_set_1.ResultSet(stream, format, query_id),
          values_encoder: new utils_1.WebValuesEncoder(),
          close_stream: (stream) => stream.cancel()
        },
        ...config || {}
      });
    }
    exports.createClient = createClient2;
  }
});

// node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/.pnpm/@clickhouse+client-web@0.2.10/node_modules/@clickhouse/client-web/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SettingsMap = exports.ClickHouseClient = exports.ClickHouseLogLevel = exports.ClickHouseError = exports.ResultSet = exports.createClient = void 0;
    var client_1 = require_client2();
    Object.defineProperty(exports, "createClient", { enumerable: true, get: function() {
      return client_1.createClient;
    } });
    var result_set_1 = require_result_set();
    Object.defineProperty(exports, "ResultSet", { enumerable: true, get: function() {
      return result_set_1.ResultSet;
    } });
    var client_common_1 = require_dist();
    Object.defineProperty(exports, "ClickHouseError", { enumerable: true, get: function() {
      return client_common_1.ClickHouseError;
    } });
    Object.defineProperty(exports, "ClickHouseLogLevel", { enumerable: true, get: function() {
      return client_common_1.ClickHouseLogLevel;
    } });
    Object.defineProperty(exports, "ClickHouseClient", { enumerable: true, get: function() {
      return client_common_1.ClickHouseClient;
    } });
    Object.defineProperty(exports, "SettingsMap", { enumerable: true, get: function() {
      return client_common_1.SettingsMap;
    } });
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
          } catch (_) {
          }
        }
        function indirectEvalThis() {
          try {
            return (void 0, eval)("(function() { return this; })()");
          } catch (_) {
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
        function metadata(metadataKey, metadataValue) {
          function decorator(target, propertyKey) {
            if (!IsObject(target))
              throw new TypeError();
            if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
              throw new TypeError();
            OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
          }
          return decorator;
        }
        exporter("metadata", metadata);
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
          for (var i = decorators.length - 1; i >= 0; --i) {
            var decorator = decorators[i];
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
          for (var i = decorators.length - 1; i >= 0; --i) {
            var decorator = decorators[i];
            var decorated = decorator(target, propertyKey, descriptor);
            if (!IsUndefined(decorated) && !IsNull(decorated)) {
              if (!IsObject(decorated))
                throw new TypeError();
              descriptor = decorated;
            }
          }
          return descriptor;
        }
        function OrdinaryHasMetadata(MetadataKey, O, P) {
          var hasOwn2 = OrdinaryHasOwnMetadata(MetadataKey, O, P);
          if (hasOwn2)
            return true;
          var parent = OrdinaryGetPrototypeOf(O);
          if (!IsNull(parent))
            return OrdinaryHasMetadata(MetadataKey, parent, P);
          return false;
        }
        function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
          var provider = GetMetadataProvider(
            O,
            P,
            /*Create*/
            false
          );
          if (IsUndefined(provider))
            return false;
          return ToBoolean(provider.OrdinaryHasOwnMetadata(MetadataKey, O, P));
        }
        function OrdinaryGetMetadata(MetadataKey, O, P) {
          var hasOwn2 = OrdinaryHasOwnMetadata(MetadataKey, O, P);
          if (hasOwn2)
            return OrdinaryGetOwnMetadata(MetadataKey, O, P);
          var parent = OrdinaryGetPrototypeOf(O);
          if (!IsNull(parent))
            return OrdinaryGetMetadata(MetadataKey, parent, P);
          return void 0;
        }
        function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
          var provider = GetMetadataProvider(
            O,
            P,
            /*Create*/
            false
          );
          if (IsUndefined(provider))
            return;
          return provider.OrdinaryGetOwnMetadata(MetadataKey, O, P);
        }
        function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
          var provider = GetMetadataProvider(
            O,
            P,
            /*Create*/
            true
          );
          provider.OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P);
        }
        function OrdinaryMetadataKeys(O, P) {
          var ownKeys = OrdinaryOwnMetadataKeys(O, P);
          var parent = OrdinaryGetPrototypeOf(O);
          if (parent === null)
            return ownKeys;
          var parentKeys = OrdinaryMetadataKeys(parent, P);
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
        function OrdinaryOwnMetadataKeys(O, P) {
          var provider = GetMetadataProvider(
            O,
            P,
            /*create*/
            false
          );
          if (!provider) {
            return [];
          }
          return provider.OrdinaryOwnMetadataKeys(O, P);
        }
        function Type2(x) {
          if (x === null)
            return 1;
          switch (typeof x) {
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
              return x === null ? 1 : 6;
            default:
              return 6;
          }
        }
        function IsUndefined(x) {
          return x === void 0;
        }
        function IsNull(x) {
          return x === null;
        }
        function IsSymbol(x) {
          return typeof x === "symbol";
        }
        function IsObject(x) {
          return typeof x === "object" ? x !== null : typeof x === "function";
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
        function OrdinaryToPrimitive(O, hint) {
          if (hint === "string") {
            var toString_1 = O.toString;
            if (IsCallable(toString_1)) {
              var result = toString_1.call(O);
              if (!IsObject(result))
                return result;
            }
            var valueOf = O.valueOf;
            if (IsCallable(valueOf)) {
              var result = valueOf.call(O);
              if (!IsObject(result))
                return result;
            }
          } else {
            var valueOf = O.valueOf;
            if (IsCallable(valueOf)) {
              var result = valueOf.call(O);
              if (!IsObject(result))
                return result;
            }
            var toString_2 = O.toString;
            if (IsCallable(toString_2)) {
              var result = toString_2.call(O);
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
        function SameValueZero(x, y) {
          return x === y || x !== x && y !== y;
        }
        function GetMethod(V, P) {
          var func = V[P];
          if (func === void 0 || func === null)
            return void 0;
          if (!IsCallable(func))
            throw new TypeError();
          return func;
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
          var f = iterator["return"];
          if (f)
            f.call(iterator);
        }
        function OrdinaryGetPrototypeOf(O) {
          var proto = Object.getPrototypeOf(O);
          if (typeof O !== "function" || O === functionPrototype)
            return proto;
          if (proto !== functionPrototype)
            return proto;
          var prototype = O.prototype;
          var prototypeProto = prototype && Object.getPrototypeOf(prototype);
          if (prototypeProto == null || prototypeProto === Object.prototype)
            return proto;
          var constructor = prototypeProto.constructor;
          if (typeof constructor !== "function")
            return proto;
          if (constructor === O)
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
          function getProviderNoCache(O, P) {
            if (!IsUndefined(first)) {
              if (first.isProviderFor(O, P))
                return first;
              if (!IsUndefined(second)) {
                if (second.isProviderFor(O, P))
                  return first;
                if (!IsUndefined(rest)) {
                  var iterator = GetIterator(rest);
                  while (true) {
                    var next = IteratorStep(iterator);
                    if (!next) {
                      return void 0;
                    }
                    var provider = IteratorValue(next);
                    if (provider.isProviderFor(O, P)) {
                      IteratorClose(iterator);
                      return provider;
                    }
                  }
                }
              }
            }
            if (!IsUndefined(fallback) && fallback.isProviderFor(O, P)) {
              return fallback;
            }
            return void 0;
          }
          function getProvider(O, P) {
            var providerMap = targetProviderMap.get(O);
            var provider;
            if (!IsUndefined(providerMap)) {
              provider = providerMap.get(P);
            }
            if (!IsUndefined(provider)) {
              return provider;
            }
            provider = getProviderNoCache(O, P);
            if (!IsUndefined(provider)) {
              if (IsUndefined(providerMap)) {
                providerMap = new _Map();
                targetProviderMap.set(O, providerMap);
              }
              providerMap.set(P, provider);
            }
            return provider;
          }
          function hasProvider(provider) {
            if (IsUndefined(provider))
              throw new TypeError();
            return first === provider || second === provider || !IsUndefined(rest) && rest.has(provider);
          }
          function setProvider(O, P, provider) {
            if (!hasProvider(provider)) {
              throw new Error("Metadata provider not registered.");
            }
            var existingProvider = getProvider(O, P);
            if (existingProvider !== provider) {
              if (!IsUndefined(existingProvider)) {
                return false;
              }
              var providerMap = targetProviderMap.get(O);
              if (IsUndefined(providerMap)) {
                providerMap = new _Map();
                targetProviderMap.set(O, providerMap);
              }
              providerMap.set(P, provider);
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
          var metadata2 = new _WeakMap();
          var provider = {
            isProviderFor: function(O, P) {
              var targetMetadata = metadata2.get(O);
              if (IsUndefined(targetMetadata))
                return false;
              return targetMetadata.has(P);
            },
            OrdinaryDefineOwnMetadata: OrdinaryDefineOwnMetadata2,
            OrdinaryHasOwnMetadata: OrdinaryHasOwnMetadata2,
            OrdinaryGetOwnMetadata: OrdinaryGetOwnMetadata2,
            OrdinaryOwnMetadataKeys: OrdinaryOwnMetadataKeys2,
            OrdinaryDeleteMetadata
          };
          metadataRegistry.registerProvider(provider);
          return provider;
          function GetOrCreateMetadataMap(O, P, Create) {
            var targetMetadata = metadata2.get(O);
            var createdTargetMetadata = false;
            if (IsUndefined(targetMetadata)) {
              if (!Create)
                return void 0;
              targetMetadata = new _Map();
              metadata2.set(O, targetMetadata);
              createdTargetMetadata = true;
            }
            var metadataMap = targetMetadata.get(P);
            if (IsUndefined(metadataMap)) {
              if (!Create)
                return void 0;
              metadataMap = new _Map();
              targetMetadata.set(P, metadataMap);
              if (!registry.setProvider(O, P, provider)) {
                targetMetadata.delete(P);
                if (createdTargetMetadata) {
                  metadata2.delete(O);
                }
                throw new Error("Wrong provider for target.");
              }
            }
            return metadataMap;
          }
          function OrdinaryHasOwnMetadata2(MetadataKey, O, P) {
            var metadataMap = GetOrCreateMetadataMap(
              O,
              P,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return false;
            return ToBoolean(metadataMap.has(MetadataKey));
          }
          function OrdinaryGetOwnMetadata2(MetadataKey, O, P) {
            var metadataMap = GetOrCreateMetadataMap(
              O,
              P,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return void 0;
            return metadataMap.get(MetadataKey);
          }
          function OrdinaryDefineOwnMetadata2(MetadataKey, MetadataValue, O, P) {
            var metadataMap = GetOrCreateMetadataMap(
              O,
              P,
              /*Create*/
              true
            );
            metadataMap.set(MetadataKey, MetadataValue);
          }
          function OrdinaryOwnMetadataKeys2(O, P) {
            var keys = [];
            var metadataMap = GetOrCreateMetadataMap(
              O,
              P,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return keys;
            var keysObj = metadataMap.keys();
            var iterator = GetIterator(keysObj);
            var k = 0;
            while (true) {
              var next = IteratorStep(iterator);
              if (!next) {
                keys.length = k;
                return keys;
              }
              var nextValue = IteratorValue(next);
              try {
                keys[k] = nextValue;
              } catch (e) {
                try {
                  IteratorClose(iterator);
                } finally {
                  throw e;
                }
              }
              k++;
            }
          }
          function OrdinaryDeleteMetadata(MetadataKey, O, P) {
            var metadataMap = GetOrCreateMetadataMap(
              O,
              P,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return false;
            if (!metadataMap.delete(MetadataKey))
              return false;
            if (metadataMap.size === 0) {
              var targetMetadata = metadata2.get(O);
              if (!IsUndefined(targetMetadata)) {
                targetMetadata.delete(P);
                if (targetMetadata.size === 0) {
                  metadata2.delete(targetMetadata);
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
            isProviderFor: function(O, P) {
              var metadataPropertySet = metadataOwner.get(O);
              if (!IsUndefined(metadataPropertySet) && metadataPropertySet.has(P)) {
                return true;
              }
              if (getOwnMetadataKeys2(O, P).length) {
                if (IsUndefined(metadataPropertySet)) {
                  metadataPropertySet = new _Set();
                  metadataOwner.set(O, metadataPropertySet);
                }
                metadataPropertySet.add(P);
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
        function GetMetadataProvider(O, P, Create) {
          var registeredProvider = metadataRegistry.getProvider(O, P);
          if (!IsUndefined(registeredProvider)) {
            return registeredProvider;
          }
          if (Create) {
            if (metadataRegistry.setProvider(O, P, metadataProvider)) {
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
                  for (var i = index + 1; i < size; i++) {
                    this._keys[i - 1] = this._keys[i];
                    this._values[i - 1] = this._values[i];
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
                return new MapIterator(this._keys, this._values, getValue);
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
                  for (var i = 0; i < this._keys.length; i++) {
                    if (SameValueZero(this._keys[i], key)) {
                      this._cacheIndex = i;
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
          function getKey(key, _) {
            return key;
          }
          function getValue(_, value) {
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
            for (var i = 0; i < size; ++i)
              buffer[i] = Math.random() * 255 | 0;
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

// packages/extensions/clickhouse-web/dist/driver.js
var import_client_web = __toESM(require_dist2(), 1);

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
  util2.assertEqual = (_) => {
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
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
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
  util2.jsonStringifyReplacer = (_, value) => {
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
  const t = typeof data;
  switch (t) {
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
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
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
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
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
    ].filter((x) => !!x)
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
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
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
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

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
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
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
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
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
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
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
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
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
    }).filter((x) => !!x);
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
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
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
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
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
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
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
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
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
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
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
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
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
    MetadataStorage2.prototype.addTypeMetadata = function(metadata) {
      if (!this._typeMetadatas.has(metadata.target)) {
        this._typeMetadatas.set(metadata.target, /* @__PURE__ */ new Map());
      }
      this._typeMetadatas.get(metadata.target).set(metadata.propertyName, metadata);
    };
    MetadataStorage2.prototype.addTransformMetadata = function(metadata) {
      if (!this._transformMetadatas.has(metadata.target)) {
        this._transformMetadatas.set(metadata.target, /* @__PURE__ */ new Map());
      }
      if (!this._transformMetadatas.get(metadata.target).has(metadata.propertyName)) {
        this._transformMetadatas.get(metadata.target).set(metadata.propertyName, []);
      }
      this._transformMetadatas.get(metadata.target).get(metadata.propertyName).push(metadata);
    };
    MetadataStorage2.prototype.addExposeMetadata = function(metadata) {
      if (!this._exposeMetadatas.has(metadata.target)) {
        this._exposeMetadatas.set(metadata.target, /* @__PURE__ */ new Map());
      }
      this._exposeMetadatas.get(metadata.target).set(metadata.propertyName, metadata);
    };
    MetadataStorage2.prototype.addExcludeMetadata = function(metadata) {
      if (!this._excludeMetadatas.has(metadata.target)) {
        this._excludeMetadatas.set(metadata.target, /* @__PURE__ */ new Map());
      }
      this._excludeMetadatas.get(metadata.target).set(metadata.propertyName, metadata);
    };
    MetadataStorage2.prototype.findTransformMetadatas = function(target, propertyName, transformationType) {
      return this.findMetadatas(this._transformMetadatas, target, propertyName).filter(function(metadata) {
        if (!metadata.options)
          return true;
        if (metadata.options.toClassOnly === true && metadata.options.toPlainOnly === true)
          return true;
        if (metadata.options.toClassOnly === true) {
          return transformationType === TransformationType.CLASS_TO_CLASS || transformationType === TransformationType.PLAIN_TO_CLASS;
        }
        if (metadata.options.toPlainOnly === true) {
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
    MetadataStorage2.prototype.findExposeMetadataByCustomName = function(target, name) {
      return this.getExposedMetadatas(target).find(function(metadata) {
        return metadata.options && metadata.options.name === name;
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
      return this.getExposedMetadatas(target).filter(function(metadata) {
        if (!metadata.options)
          return true;
        if (metadata.options.toClassOnly === true && metadata.options.toPlainOnly === true)
          return true;
        if (metadata.options.toClassOnly === true) {
          return transformationType === TransformationType.CLASS_TO_CLASS || transformationType === TransformationType.PLAIN_TO_CLASS;
        }
        if (metadata.options.toPlainOnly === true) {
          return transformationType === TransformationType.CLASS_TO_PLAIN;
        }
        return true;
      }).map(function(metadata) {
        return metadata.propertyName;
      });
    };
    MetadataStorage2.prototype.getExcludedProperties = function(target, transformationType) {
      return this.getExcludedMetadatas(target).filter(function(metadata) {
        if (!metadata.options)
          return true;
        if (metadata.options.toClassOnly === true && metadata.options.toPlainOnly === true)
          return true;
        if (metadata.options.toClassOnly === true) {
          return transformationType === TransformationType.CLASS_TO_CLASS || transformationType === TransformationType.PLAIN_TO_CLASS;
        }
        if (metadata.options.toPlainOnly === true) {
          return transformationType === TransformationType.CLASS_TO_PLAIN;
        }
        return true;
      }).map(function(metadata) {
        return metadata.propertyName;
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
function isPromise(p) {
  return p !== null && typeof p === "object" && typeof p.then === "function";
}

// node_modules/.pnpm/class-transformer@0.5.1/node_modules/class-transformer/esm5/TransformOperationExecutor.js
var __spreadArray = function(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
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
        return new Promise(function(resolve, reject) {
          value.then(function(data) {
            return resolve(_this.transform(void 0, data, targetType, void 0, void 0, level + 1));
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
        metadatas = metadatas.filter(function(metadata) {
          if (!metadata.options)
            return true;
          return _this.checkVersion(metadata.options.since, metadata.options.until);
        });
      }
      if (this.options.groups && this.options.groups.length) {
        metadatas = metadatas.filter(function(metadata) {
          if (!metadata.options)
            return true;
          return _this.checkGroups(metadata.options.groups);
        });
      } else {
        metadatas = metadatas.filter(function(metadata) {
          return !metadata.options || !metadata.options.groups || !metadata.options.groups.length;
        });
      }
      metadatas.forEach(function(metadata) {
        value = metadata.transformFn({ value, key, obj, type: transformationType, options: _this.options });
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
  __assign = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
        t[p] = s[p];
    }
    return t;
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
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
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
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
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
        const intersection = wordChars.filter((c) => alphabetChars.includes(c));
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
    const inRangeNumbers = numbers.filter((n) => n >= 0 && n <= this.maxValue());
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
    for (const c of id.split("")) {
      if (!alphabetChars.includes(c)) {
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
    let offset = numbers.reduce((a, v, i) => this.alphabet[v % this.alphabet.length].codePointAt(0) + i + a, numbers.length) % this.alphabet.length;
    offset = (offset + increment) % this.alphabet.length;
    let alphabet = this.alphabet.slice(offset) + this.alphabet.slice(0, offset);
    const prefix = alphabet.charAt(0);
    alphabet = alphabet.split("").reverse().join("");
    const ret = [prefix];
    for (let i = 0; i !== numbers.length; i++) {
      const num = numbers[i];
      ret.push(this.toId(num, alphabet.slice(1)));
      if (i < numbers.length - 1) {
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
    for (let i = 0, j = chars.length - 1; j > 0; i++, j--) {
      const r = (i * j + chars[i].codePointAt(0) + chars[j].codePointAt(0)) % chars.length;
      [chars[i], chars[r]] = [chars[r], chars[i]];
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
    return id.split("").reduce((a, v) => a * chars.length + chars.indexOf(v), 0);
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
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
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

// packages/extensions/clickhouse-web/dist/driver.js
var ConfigSchema = external_exports.object({
  connectionUrl: external_exports.string().url()
});
function buildClickHouseConfig(connectionUrl) {
  const url = new URL(connectionUrl);
  const protocol = url.protocol === "clickhouse:" ? "http:" : url.protocol;
  const host = `${protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`;
  return {
    host,
    username: url.username ? decodeURIComponent(url.username) : "default",
    password: url.password ? decodeURIComponent(url.password) : "",
    database: url.pathname ? url.pathname.replace(/^\//, "") || "default" : "default"
  };
}
function makeClickHouseDriver(context) {
  const clientMap = /* @__PURE__ */ new Map();
  const getClient = (config) => {
    const key = config.connectionUrl;
    if (!clientMap.has(key)) {
      const clientConfig = buildClickHouseConfig(config.connectionUrl);
      const client = (0, import_client_web.createClient)(clientConfig);
      clientMap.set(key, client);
    }
    return clientMap.get(key);
  };
  return {
    async testConnection(config) {
      const parsed = ConfigSchema.parse(config);
      const client = getClient(parsed);
      await client.query({
        query: "SELECT 1",
        format: "JSON"
      });
      context.logger?.info?.("clickhouse: testConnection ok");
    },
    async metadata(config) {
      const parsed = ConfigSchema.parse(config);
      const client = getClient(parsed);
      const databasesResult = await client.query({
        query: `SELECT name FROM system.databases WHERE name NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA') ORDER BY name`,
        format: "JSON"
      });
      const databasesData = await databasesResult.json();
      const databases = databasesData.data;
      const tablesResult = await client.query({
        query: `
          SELECT 
            database as table_schema,
            name as table_name,
            total_rows,
            total_bytes
          FROM system.tables
          WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
          ORDER BY database, name
        `,
        format: "JSON"
      });
      const tablesData = await tablesResult.json();
      const columnsResult = await client.query({
        query: `
          SELECT 
            database as table_schema,
            table as table_name,
            name as column_name,
            type as data_type,
            position as ordinal_position,
            default_kind,
            default_expression
          FROM system.columns
          WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
          ORDER BY database, table, position
        `,
        format: "JSON"
      });
      const columnsData = await columnsResult.json();
      let tableId = 1;
      const tableMap = /* @__PURE__ */ new Map();
      const buildColumn = (schema, table, name, ordinal, dataType) => ({
        id: `${schema}.${table}.${name}`,
        table_id: 0,
        schema,
        table,
        name,
        ordinal_position: ordinal,
        data_type: dataType,
        format: dataType,
        is_identity: false,
        identity_generation: null,
        is_generated: false,
        is_nullable: true,
        // ClickHouse columns are generally nullable unless specified
        is_updatable: true,
        is_unique: false,
        check: null,
        default_value: null,
        enums: [],
        comment: null
      });
      for (const row of tablesData.data) {
        const key = `${row.table_schema}.${row.table_name}`;
        if (!tableMap.has(key)) {
          tableMap.set(key, {
            id: tableId++,
            schema: row.table_schema,
            name: row.table_name,
            totalRows: row.total_rows,
            totalBytes: row.total_bytes,
            columns: []
          });
        }
      }
      for (const row of columnsData.data) {
        const key = `${row.table_schema}.${row.table_name}`;
        const table = tableMap.get(key);
        if (table) {
          table.columns.push(buildColumn(row.table_schema, row.table_name, row.column_name, row.ordinal_position, row.data_type));
        }
      }
      const tables = Array.from(tableMap.values()).map((table) => ({
        id: table.id,
        schema: table.schema,
        name: table.name,
        rls_enabled: false,
        rls_forced: false,
        bytes: Number(table.totalBytes) || 0,
        size: String(table.totalRows ?? "0"),
        live_rows_estimate: Number(table.totalRows) || 0,
        dead_rows_estimate: 0,
        comment: null,
        primary_keys: [],
        relationships: []
      }));
      const columns = Array.from(tableMap.values()).flatMap((table) => table.columns.map((column) => ({
        ...column,
        table_id: table.id
      })));
      const schemas = databases.map((db, idx) => ({
        id: idx + 1,
        name: db.name,
        owner: "unknown"
      }));
      return DatasourceMetadataZodSchema.parse({
        version: "0.0.1",
        driver: "clickhouse.web",
        schemas,
        tables,
        columns
      });
    },
    async query(sql, config) {
      const parsed = ConfigSchema.parse(config);
      const client = getClient(parsed);
      const startTime = performance.now();
      const result = await client.query({
        query: sql,
        format: "JSON"
      });
      const data = await result.json();
      const endTime = performance.now();
      const columns = data.meta.map((meta) => ({
        name: meta.name,
        displayName: meta.name,
        originalType: meta.type
      }));
      return {
        columns,
        rows: data.data,
        stat: {
          rowsAffected: 0,
          rowsRead: data.data.length,
          rowsWritten: 0,
          queryDurationMs: endTime - startTime
        }
      };
    },
    async close() {
      for (const client of clientMap.values()) {
        await client.close();
      }
      clientMap.clear();
      context.logger?.info?.("clickhouse: closed");
    }
  };
}
var driverFactory = makeClickHouseDriver;
var driver_default = driverFactory;
export {
  driver_default as default,
  driverFactory,
  makeClickHouseDriver
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
