var _ = require('lodash');
var async = require('async');
var config = require('config');
var async = require('async');
var request = require('request')
var extend = require('util')._extend

var myCache = require( "memory-cache" );


function _readCookie(cookie, cookieName) {
    var re = new RegExp('[; ]'+cookieName+'=([^\\s;]*)');
    var sMatch = (' '+cookie).match(re);
    if (cookieName && sMatch) {
        return sMatch[1];
    }
    return '';
}

exports.putDevices = function(req, res){

var sessionToken = myCache.get('sessionToken')
    
    console.log("token: " + myCache.get('sessionToken'))
    var body = req.body;

    var deviceNum = body.deviceNum
    var category = body.category
    var action = body.action
    var data = body.data
    var services = config.get('vera.categoryService') 

    console.log(services)
    var serviceId = services[category]

    var queryObject = {
        id: 'lu_action',
        output_format: 'json',
        DeviceNum: deviceNum,
        serviceId: serviceId,
        action: action
    }
    var o = extend({}, queryObject);
    extend(o,  data);

    console.log(o)

    console.log("url: " + url)
    
    var url = 'https://' + config.get('vera.api.relayHost') + '/relay/relay/relay/device/' + config.get('vera.api.unitId') + '/session/'+  sessionToken + '/port_3480/data_request'
    console.log("url: " + url)
    request({url:url, qs: o} , function (error, response, body) {
        console.log('device action statusCode:', response && response.statusCode); // Print the response status code if a response was received 
        if (error) {
            console.log(error)
        } else {
            console.log(body)
        }

        res.json(body)

    })

}


exports.getUpdate = function(req, res){

var sessionToken = myCache.get('sessionToken')
    
    console.log("token: " + myCache.get('sessionToken'))
    var body = req.query;

    var dataVersion = body.dataVersion

    var url = 'https://' + config.get('vera.api.relayHost') + '/relay/relay/relay/device/' + config.get('vera.api.unitId') + '/session/'+  sessionToken + '/port_3480/data_request?id=status&DataVersion='+ dataVersion +'&output_format=json'
    console.log("url: " + url)
    request(url , function (error, response, body) {
        console.log('poll statusCode:', response && response.statusCode); // Print the response status code if a response was received 
        if (error) {
            console.log(error)
        } else {
            console.log(body)
        }

        res.json(JSON.parse(body))

    })

}

exports.getDevices = function(req, res){
var serverAccount, userIdentity, identitySignature, pkAccount, sessionToken, proxySessionToken, serverAltAccount, serverEvent, serverEventAlt


    async.waterfall([
        function(callback){
            request('https://' + config.get('vera.api.authaHost') + '/autha/auth/username/' + config.get('vera.api.username') + '?SHA1Password=' + config.get('vera.api.digest') + '&PK_Oem=1' , function (error, response, body) {
                if (error) {
                    return callback(error)
                }
                console.log('/autha/auth/username statusCode:', response && response.statusCode); // Print the response status code if a response was received 
                console.log('body:', body); // Print  
                var jsonBody = JSON.parse(body)
                userIdentity = jsonBody.Identity;
                serverAccount = jsonBody.Server_Account
                serverAltAccount = jsonBody.Server_Account_Alt
                serverEvent = jsonBody.Server_Event
                serverEventAlt = jsonBody.Server_Event_Alt
                identitySignature = jsonBody.IdentitySignature

                var userIdentityBase64Decoded = new Buffer(userIdentity, 'base64').toString("ascii")
                 var jsonIdentity = JSON.parse(userIdentityBase64Decoded)
                 console.log(jsonIdentity)
                
                callback()
            })
        },
        function(callback){
            //Get Proxy Session Token
            var options = {
                url: 'https://' + config.get('vera.api.relayHost') + '/info/session/token',
                headers: {
                    "MMSAuth": userIdentity,
                    "MMSAuthSig": identitySignature
                }
            }
            request(options,function(err, res, body){
                if (err) {
                    return callback(err)
                }
                console.log('/info/session/token statusCode:', res && res.statusCode); // Print the response status code if a response was received 
                console.log('proxySessionToken:', body); // Print  
                //config.set('sessionToken', proxySessionToken)
                proxySessionToken = body

                myCache.put("sessionToken", proxySessionToken)

               sessionToken =  myCache.get("sessionToken")
                    console.log("cache sessionToken value: " + sessionToken)
                
                
                callback()
            })
        },
        function(callback){
            //Get Session Token
            var options = {
                url: 'https://' + serverAccount + '/info/session/token',
                headers: {
                    "MMSAuth": userIdentity,
                    "MMSAuthSig": identitySignature
                }
            }
            request(options,function(err, res, body){
                if (err) {
                    return callback(err)
                }
                console.log('/info/session/token statusCode:', res && res.statusCode); // Print the response status code if a response was received 
                console.log('sessionToken:', body); // Print  
                sessionToken = body
                callback()
            })
        },
        // function(callback){
        //     //Get Vera Controller info
        //     var userIdentityBase64Decoded = new Buffer(userIdentity, 'base64').toString("ascii")
        //     var jsonIdentity = JSON.parse(userIdentityBase64Decoded)
        //     pkAccount = jsonIdentity.PK_Account
        //     console.log("pkAccount: "  + pkAccount)

        //     var options = {
        //         url: 'https://' + serverAccount + '/account/account/account/'+ pkAccount +'/devices',
        //         headers: {
        //             "MMSAuth": userIdentity,
        //             "MMSAuthSig": identitySignature
        //         }
        //     }
        //     request(options,function(err, res, body){
        //         if (err) {
        //             return callback(err)
        //         }
        //         console.log('account/account/account/696461/devices statusCode:', res && res.statusCode); // Print the response status code if a response was received 
        //         console.log('body:', body); // Print  

        //         var jsonBody = JSON.parse(body)
        //         deviceServer = jsonBody.Devices[0].Server_Device
        //         console.log("deviceServer: " + deviceServer)

        //         callback()
        //     })
        // },
        function(callback){
            //Get Devices info
            
            var options = {
                url: 'https://' + config.get('vera.api.relayHost') + '/relay/relay/relay/device/'+ config.get('vera.api.unitId') +'/session/' + proxySessionToken + '/port_3480/data_request?id=lu_sdata'
            }
            request.get(options,function(err, res, body){
                if (err) {
                    return callback(err)
                }
                console.log('/relay/relay/relay/device/ statusCode:', res && res.statusCode); // Print the response status code if a response was received 
                //console.log('/device body:', body); // Print 
                //console.log('/device body:', JSON.parse(body)); // Print 
                
                callback(null, JSON.parse(body))
            })
            
        // },
        // function(callback){
        //     //Get Devices info
            
        //     var options = {
        //         url: 'https://' + deviceServer + '/device/device/device/'+ config.get('vera.api.unitId'),
        //         headers: {
        //             "MMSAuth": userIdentity,
        //             "MMSAuthSig": identitySignature
        //         }
        //     }
        //     request.get(options,function(err, res, body){
        //         if (err) {
        //             return callback(err)
        //         }
        //         console.log('/device/device/device statusCode:', res && res.statusCode); // Print the response status code if a response was received 
        //         console.log('body:', body); // Print 
        //         callback()
        //     })
            
        }
    ], function(err, data){
        if (err) console.log(err)
      res.json(data)
        
    })


}

