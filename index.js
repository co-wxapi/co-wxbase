'use strict';
var request = require('request');
const DEFAULT_TIMEOUT = 10000;

function co_request(args){
  return function co_request_wrapper(callback){
    request(args, function(err, resp, body){
      callback(null, {err: err, resp: resp, body: body});
    });
  }
}

class TokenProvider {
  constructor(){
    this.accessToken = null;
    this.jsapiTicket = null;
  }

  *getAccessToken(){
    return this.accessToken;
  }

  *getJSAPITicket(){
    return this.jsapiTicket;
  }
}

class WxBase {
  constructor(args){
    var appId = args.appId || args.appid || args.app_id;
    var appSecret = args.appSecret || args.app_secret;
    if ( !appId || !appSecret )
      throw new Error('APPID & APPSECRET must not be empty!');
    this.appId = appId;
    this.appSecret = appSecret;
    this.timeout = args.timeout || DEFAULT_TIMEOUT;
    this.provider = null;
  }

  setTokenProvider(provider){
    this.provider = provider;
  }

  *rawRequest(url, method, args, extra){
    var params = Object.assign({}, {uri:url, method: method, timeout: this.timeout}, extra);
    if ( args ) {
      if ( method == 'GET' ) params.qs = args;
      else params.form = args;
    }
    var result = yield co_request(params);
    if ( result.err ) {
      var resp = result.resp;
      if ( resp && resp.statusCode != 200 ) {
        var err = new Error(resp.statusMessage);
        err.status = resp.statusCode;
        throw err;
      }
      else {
        err = result.err;
        throw err;
      }
    }
    else {
      return result.body;
    }
  }

  *jsonRequest(url, method, args){
    var result = yield co_request({uri:url, method: method, body:args, json: true, timeout: this.timeout});
    if ( result.err ) {
      var resp = result.resp;
      if ( resp && resp.statusCode != 200 ) {
        var err = new Error(resp.statusMessage);
        err.status = resp.statusCode;
        throw err;
      }
      else {
        err = result.err;
        throw err;
      }
    }
    else {
      var body = result.body;
      if ( body.errcode ) {
        var err = new Error(body.errmsg);
        err.code = body.errcode;
        throw err;
      }
      return result.body;
    }
  }

  *xmlRequest(url, args, extra){
    var xmlData = wxsign.xmlSign(args, this.merchantKey);
    var params = Object.assign({
      uri:url,
      method: 'POST',
      preambleCRLF: true,
      postambleCRLF: true,
      headers: { 'Content-Type': 'text/xml' },
      body: xmlData,
      timeout: this.timeout},
      extra);
    var result = yield co_request(params);
    if ( result.err ) {
      var resp = result.resp;
      if ( resp && resp.statusCode != 200 ) {
        var err = new Error(resp.statusMessage);
        err.status = resp.statusCode;
        throw err;
      }
      else {
        err = result.err;
        throw err;
      }
    }
    else {
      var body = result.body;
      if ( body.errcode ) {
        var err = new Error(body.errmsg);
        err.code = body.errcode;
        throw err;
      }
      return result.body;
    }
  }
}

module.exports = WxBase;
