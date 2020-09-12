var client = require('ari-client');

var url = "http://192.168.1.140:8088"
var username = "asterisk"
var password = "asterisk"

var sip_user = '100'
var sip_password = '100'


function provision(sip_user, sip_password){
  client.connect(url, username, password)
  .then(function (ari){
    ari.asterisk.updateObject({
        configClass: 'res_pjsip',
        id: sip_user,
        objectType: 'auth',
        fields : [
            { attribute: 'auth_type', value: 'userpass' },
            { attribute: 'username', value: sip_user },
            { attribute: 'password', value: sip_password }
        ]
    })
    .then (function (configTuples){
        console.log(configTuples)
        ari.asterisk.updateObject({
            configClass: 'res_pjsip',
            id: sip_user,
            objectType: 'aor',
            fields : [
                { attribute: 'support_path', value: "yes" },
                { attribute: 'remove_existing', value: "yes" },
                { attribute: 'max_contacts', value: "1" }
            ]
            })
            .then (function (configTuples){
                console.log(configTuples)
                ari.asterisk.updateObject({
                configClass: 'res_pjsip',
                id: sip_user,
                objectType: 'endpoint',
                fields : [
                    { attribute: 'from_user', value: sip_user },
                    { attribute: 'allow', value: "!all,g722,ulaw,alaw" },
                    { attribute: 'ice_support', value: "yes" },
                    { attribute: 'force_rport', value: "yes" },
                    { attribute: 'rewrite_contact', value: "yes" },
                    { attribute: 'rtp_symmetric', value: "yes" },
                    { attribute: 'context', value: "applications" },
                    { attribute: 'auth', value: sip_user },
                    { attribute: 'aors', value: sip_user }
                ]
                })
                .then (function (configTuples){
                    console.log(configTuples)
                })
            })
        })
  })
  .catch(function (err) {
      console.log(err)
  });

}

function deprovision(sip_user){
  client.connect(url, username, password)
  .then(function (ari){
    ari.asterisk.deleteObject({
        configClass: 'res_pjsip',
        id: sip_user,
        objectType: 'endpoint'
    })
    .then (function (configTuples){
        console.log(configTuples)
        ari.asterisk.deleteObject({
            configClass: 'res_pjsip',
            id: sip_user,
            objectType: 'aor'
            
            })
            .then (function (configTuples){
                console.log(configTuples)
                ari.asterisk.deleteObject({
                configClass: 'res_pjsip',
                id: sip_user,
                objectType: 'auth'
                })
                .then (function (configTuples){
                    console.log(configTuples)
                })
            })
        })
  })
  .catch(function (err) {
      console.log(err)
  });


}


