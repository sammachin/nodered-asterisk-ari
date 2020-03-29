module.exports = function(RED) {
    "use strict";
    var ari = require('ari-client');
    var uuid = require('uuid')

    var ariConnectionPool = (function() {
        var connections = {};
        var channels = {}
        var obj = {
            setconn: function(url,username,password, app, node) {
                var id = uuid.v4()
                ari.connect(url, username, password, function(err, client){
                    if (err) {
                        node.error(err);
                      }
                    connections[id] =client
                    clientLoaded(client, app, node,id)
                });
                connections[id]._id = id;
                connections[id]._nodeCount = 0;
                connections[id]._nodeCount += 1;
                return connections[id];
            },
            getconn : function(id){
                return connections[id]
            },
            close: function(connection) {
                connection._nodeCount -= 1;
                if (connection._nodeCount === 0) {
                    delete connections[connection._id];
                }
            },
            setchan: function(channel){
                var id = uuid.v4()
                channels[id] = channel
                return id
            },
            getchan: function(id){
                return channels[id]
            }
        };
        return obj;
    }());

    function clientLoaded (client, app, node, id) {      
        node.status({fill:"green",shape:"dot",text:"connected"});
        function stasisStart(event, channel) {
            var channelid = ariConnectionPool.setchan(channel)
            var msg = {}
            msg.channel = channelid
            msg.client = id
            msg.payload = event
            node.send(msg)
        }
        function stasisEnd(event, channel){
            console.log(event)
        }
        client.on('StasisStart', stasisStart); 
        //client.on('StasisEnd', stasisEnd);
        client.start(app);
    }

    function ari_client(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        this.server = RED.nodes.getNode(n.server);
        this.conn = ariConnectionPool.setconn(this.server.credentials.url, this.server.credentials.username, this.server.credentials.password, n.app, node)
        this.on("close", function() {
            //this.conn.close()
        });
    }
    RED.nodes.registerType("ari_client",ari_client);



    function ari_playback(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        this.media = n.media
        node.on('input', function (msg) {
          node.status({fill:"blue",shape:"dot"});
          var client = ariConnectionPool.getconn(msg.client)
          var channel = ariConnectionPool.getchan(msg.channel)
          var playback = client.Playback();
          channel.play({media: this.media},
                            playback, function(err, newPlayback) {if (err) {throw err;}});
          playback.on('PlaybackFinished', function(event, completedPlayback) {
            msg.payload = event
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
    RED.nodes.registerType("ari_playback",ari_playback);

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
  
}