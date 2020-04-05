module.exports = function(RED) {
    "use strict";
    var ari = require('ari-client');
    var uuid = require('uuid')

    var ariConnectionPool = (function() {
        var connections = {};
        var channels = {}
        var bridges = {}
        var obj = {
            setconn: function(credentials, node) {
                var id = `${credentials.url}-${credentials.username}-${node.id}`
                ari.connect(credentials.url, credentials.username, credentials.password, function(err, client){
                    if (err) {node.error(err);}
                    node.status({fill:"green",shape:"dot",text:"connected"});
                    client.id = id
                    connections[id] = client
                    return client
                });
                
            },
            getconn : function(id){
                return connections[id]
            },
            delconn: function(credentials, node) {
                var id = `${credentials.url}-${credentials.username}-${node.id}`
                delete connections[id]
            },
            setchan: function(channel){
                channels[channel.id] = channel
                return channel.id
            },
            getchan: function(id){
                return channels[id]
            },
            delchan: function(id){
                delete channels[id]
            },
            setbridge: function(node, types){
                var conn_id = Object.keys(connections)[0]
                var client = connections[conn_id]
                client.bridges.create({type: [types]}, function (err, bridge) {
                    if (err) {node.error(err);}
                    bridges[node.id] = bridge
                    node.status({fill:"green",shape:"circle"});
                });
                return 'ok'
            },
            getbridge : function(id){
                return bridges[id]
            },
        };
        return obj;
    }());


    function ari_client(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        this.server = RED.nodes.getNode(n.server);
        this.client = ariConnectionPool.setconn(this.server.credentials, node)
        
        function stasisStart(event, channel) {
            var channelid = ariConnectionPool.setchan(channel)
            var msg = {}
            msg.channel = channelid
            msg.client = `${node.server.credentials.url}-${node.server.credentials.username}-${node.id}`
            msg.payload = event
            node.send(msg)
        }
        
        function stasisEnd(event, channel){
            ariConnectionPool.delchan(channel.id)
        }
        
        this.client.on('StasisStart', stasisStart); 
        this.client.on('StasisEnd', stasisEnd);
    
        this.client.start(n.app);        
        
        this.on("close", function() {
            ariConnectionPool.delconn(this.server.credentials, node)
            node.status({fill:"red",shape:"dot",text:"no connection"});
        });
    }
    RED.nodes.registerType("ari_client",ari_client);



    function ari_playback(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        this.media = n.media
        node.on('input', function (msg) {
          node.status({fill:"blue",shape:"dot"});

          var channel = ariConnectionPool.getchan(msg.channel)
          var client = ariConnectionPool.getconn(msg.client)
          var playback = client.Playback()
          
          playback.once('PlaybackFinished', function(event, completedPlayback) {
            console.log('PLAYBACK FINISHED')  
            msg.payload = event
            node.send(msg)
            node.status({})
          });
          console.log(playback)
          channel.play({media: this.media}, playback, function(err, Playback) {
                if (err) {throw err;} 
            });
        });         
          
    }
    RED.nodes.registerType("ari_playback",ari_playback);


    function ari_answer(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        node.on('input', function (msg) {
          node.status({fill:"blue",shape:"dot"});
          var client = ariConnectionPool.getconn(msg.client)
          var channel = ariConnectionPool.getchan(msg.channel)
          client.channels.answer({channelId: channel.id},function (err) {
            if (err) {node.error(err);}
            msg.payload = 'answered'
            node.send(msg)
            node.status({})
          });
        });         
          
        this.on("close", function() {
              // Called when the node is shutdown - eg on redeploy.
              // Allows ports to be closed, connections dropped etc.
              // eg: node.client.disconnect();
        });
    }
    RED.nodes.registerType("ari_answer",ari_answer);


    function ari_hangup(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        node.on('input', function (msg) {
          node.status({fill:"blue",shape:"dot"});
            var channel = ariConnectionPool.getchan(msg.channel)
            channel.hangup(function(err) {
                if (err) {node.error(err);}
                node.status({})
            });            
        });
    } 
    RED.nodes.registerType("ari_hangup",ari_hangup);

    function ari_bridge(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var types = ['mixing', 'dtmf']
        ariConnectionPool.setbridge(node, types)
        node.on('input', function (msg) {
          node.status({fill:"green",shape:"dot"});
          if ('channel' in msg){
            var client = ariConnectionPool.getconn(msg.client)
            var channel = ariConnectionPool.getchan(msg.channel)
            var bridge = ariConnectionPool.getbridge(node.id)
            bridge.addChannel({channel: channel.id})
          }
        });         
          
        this.on("close", function() {
              // Called when the node is shutdown - eg on redeploy.
              // Allows ports to be closed, connections dropped etc.
              // eg: node.client.disconnect();
        });
    }
    RED.nodes.registerType("ari_bridge",ari_bridge);

  
}