
module.exports = function(RED) { 
 function asterisk_ari(n){
   RED.nodes.createNode(this, n);
   this.url = n.url;
   this.username = n.username;
   this.password = n.password;
 }
 RED.nodes.registerType("asterisk_ari",asterisk_ari,{
   credentials: {
     url: {type:"text"},
     username: {type:"text"},
     password: {type:"text"}
   }
 });    
 
}