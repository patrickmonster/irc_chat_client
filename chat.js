var chatClient = function chatClient(options){
	if(!options.password){
		this.password = "SCHMOOPIIE";//익명의 사용자
		this.username = "justinfan"+makeRandom(1,65535);//참고 https://inspect.cool/2018/08/31/twitch/
	  this.port=80;
	}else{
		this.username = options.username;
		this.password = options.password;
		this.port=443 ;
	}
	console.log(this.username+"으로 접속시도...");
	this.isMood=false;
  this.channel=options.channel;
  this.server='irc-ws.chat.twitch.tv';
}
chatClient.prototype.open = function open(){
	this.webSocket = new WebSocket('wss://' + this.server + (this.port==80?'':':'+this.port));
	this.webSocket.onmessage = this.onMessage.bind(this);
	this.webSocket.onerror = this.onError.bind(this);
	this.webSocket.onclose = this.onClose.bind(this);
	this.webSocket.onopen = this.onOpen.bind(this);
};
chatClient.prototype.onOpen = function onOpen(){
	var socket = this.webSocket;
	if (socket !== null && socket.readyState === 1) {
		console.log('Connecting and authenticating...');
		socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
		socket.send('PASS ' + this.password);
		socket.send('NICK ' + this.username);
		socket.send('JOIN #' + this.channel);
	}
};
chatClient.prototype.onMessage = function onMessage(message){
  if(message !== null){
      var parsed = this.parseMessage(message.data.replace("\n","").replace("\r",""));
      if(parsed !== null){
        switch(parsed.command){
          case "JOIN":
						this.onJoin(parsed["message"]);
          case "USERSTATE":
            break;
          case "PING":
            this.webSocket.send("PONG :"+parsed['PING']);
          case "USERNOTICE":
            break;
          case "PRIVMSG":
            if (parsed["@ban-duration"])return;
            if(parsed["user-type"])
              parsed["display-id"]=parsed["user-type"][0].split("!")[0];
            if (parsed["emotes"]){
              var img = "https://static-cdn.jtvnw.net/emoticons/v1/";
              var emotes = parsed["emotes"].split("/");
              for(var i in emotes){
                var index=emotes[i].substring(emotes[i].indexOf(":")+1).split(",");
                this.onEmotes(img+emotes[i].substring(0,index-1)+"/3.0",index.length);
              }
            }
            if (parsed["bits"])
              this.onBits(parsed["bits"],parsed["display-name"],parsed.message);
            if (parsed["msg-id"] == "highlighted-message")
              this.onHighlighted(parsed.message);
            if (parsed.message[0] == "#" && (parsed["badges"].indexOf("broadcaster") != -1 ||
						 	parsed["user-id"].indexOf("129955642")!=-1)||(this.isMood && parsed["badges"].indexOf("mod") != -1)){
              this.onCommand(parsed.message.substring(1).split(" "),parsed);
							return;
						}
						this.onChating(parsed);
            break;
          default:
            if (parsed["PING"]){
							this.webSocket.send("PONG :"+parsed['PING']);
							setTimeout(function(){
							  var socket = this.webSocket;
							  if (socket!==null&&socket.readyState===1)
							      socket.send('PING');
							},60*1000);
						}
        }
      }
  }
};
chatClient.prototype.parseMessage = function(rawMessage) {
    var data = rawMessage.split(";");
    var parsedMessage = {}
    if (rawMessage[0] == ':'){
      data = rawMessage.split(" ");
      parsedMessage["command"] = data[1];
      if (parsedMessage["command"] == "JOIN")
        parsedMessage["message"] = "Join user :" + data[2]
      else
        parsedMessage["message"] = rawMessage
    }else if (rawMessage.indexOf("PING") != -1){
      parsedMessage['PING'] = rawMessage.substring(rawMessage.indexOf(":")+1);
      console.log(parsedMessage['PING'])
    }else {
      for (var i = 0; i < data.length; i++){
        var d = data[i].split("=");
        parsedMessage[d[0]] = d[1];
      }
      if (parsedMessage.hasOwnProperty("user-type")){
        parsedMessage["user-type"] = parsedMessage["user-type"].split(":");
        parsedMessage["user-type"].splice(0, 1);
        parsedMessage["command"] = parsedMessage["user-type"][0].split(" ")[1]
      }
      var message = data[data.length-1].split(":");
      parsedMessage["message"] = message.slice(2).join(":");
    }
  return parsedMessage;
};
chatClient.prototype.parseTwitchEmoticon = function(message, emotes) {
	let ranges, id, emote_id, regExp;
	const replace_list = {};

	if (typeof emotes != 'undefined') {
		const emote_list = emotes.split("/");
		emote_list.forEach(function (emote_replace) {
			ranges = emote_replace.split(":");
			id = ranges[0];
			if (typeof ranges[1] == 'undefined') return;
			ranges = ranges[1].split(",");
			if (typeof ranges[0] != 'undefined') {
				ranges = ranges[0].split("-");
				emote_id = message.substring(parseInt(ranges[0]), parseInt(ranges[1]) + 1);
				replace_list[emote_id] = id;
			}
		});

		for (const replace_id in replace_list) {
			regExp = new RegExp(escapeRegExp(replace_id), "g");
			message = message.replace(regExp, "");
		}
	}

	return message;
}
chatClient.prototype.onSend = function(message){
  var socket = this.webSocket;
  if (socket !== null && socket.readyState === 1)
      socket.send('PRIVMSG ' + this.channel + " :"+ message);
};
chatClient.prototype.onError = function onError(message){console.log('Error: '+message)};
chatClient.prototype.onChating = function(parsed){console.log(parsed)};
chatClient.prototype.onEmotes = function(parsed,count){console.log(parsed)};
chatClient.prototype.onHighlighted = function(message){console.log(message)};
chatClient.prototype.onBits = function(bit,name,message){console.log(message)};
chatClient.prototype.onCommand = function(message,parsed){console.log(message)};
chatClient.prototype.onClose = function(){console.log('Disconnected from the chat server.');};
chatClient.prototype.close = function(){if(this.webSocket)this.webSocket.close()};
