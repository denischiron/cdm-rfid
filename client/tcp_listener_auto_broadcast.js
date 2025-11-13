const { networkInterfaces } = require('os');
const net = require('net');
const dgram = require('node:dgram');
const { Buffer } = require('node:buffer');


/**************************************************/
// TCP Params :
let tcpHost = '192.168.1.13'; // default value
const tcpPort = 1300;

// UDP Params (Broadcast) :
const udpHost = "255.255.255.255";
const udpPort = 41234;
/**************************************************/


const getLocal_IP = function() {

    const nets = networkInterfaces();
    const results = Object.create(null); // Or just '{}', an empty object
    const ips = [];

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
            if (net.family === familyV4Value && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
                ips.push(net.address);
            }
        }
    }

    if (ips.length > 0) {
      return ips[0];
    } else {
        log("Local IP NOT FOUND", results);
        return "NOT_FOUND";
    }
}

const getTagIdFromTagData = function(tag) {

    const STX  = tag.substr(0, 2);
    const SEQ  = tag.substr(2, 2);
    const DADD = tag.substr(4, 2);
    const DATA_LENGTH = parseInt(tag.substr(6, 2));
    const STATUS = tag.substr(8, 2);

    const dataLength = 2 * (DATA_LENGTH - 1);
    const dataEndPosition = 10 + dataLength;

    if (dataLength <= 1) {
        return "";
    }

    const DATA = tag.substr(10, dataLength);
    const BCC = tag.substr(dataEndPosition, 2);
    const ETX = tag.substr(dataEndPosition + 2, 2);

    return DATA;
}

const log = function(data) {
    const timeMySQL = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log(timeMySQL + ": " + data);
}


//
// TCP listener
//

// Local IP address of the PC
const localIP = getLocal_IP();
if (localIP !== "NOT_FOUND") {
    tcpHost = localIP;
}

log('Server IP address ' + tcpHost);
log('Launch server listening on port ' + tcpPort);

const tcpSocket = net.createServer((socket) => {

  log('client connected to server');

  socket.on("data", (data) => {

    const tagData = data.toString('hex');
    const tagID = getTagIdFromTagData(tagData);
    log(`Received data : ${tagID}`);


    // UDP Socket :
    const message = Buffer.from(socket.remoteAddress + "::" + tagID);
    const udpSocket = dgram.createSocket('udp4');

    // à tester : https://gist.github.com/himalay/1ee3458c4d70732fbe67639bde9bd914
    // udpSocket.bind(() => {

    udpSocket.bind(0, undefined, function() {
        // log(`Udp socket ready`);
        udpSocket.setBroadcast(true);
        udpSocket.send(message, 0, message.length, udpPort, udpHost, (err) => {
          if (err) throw err;
          // udpSocket.close();
        });
    });


  });

  socket.on('end', () => {
    log('client disconnected');
  });

  socket.on('error', (error) => {
    log(`Error: ${error.message}`);
  });

  socket.write('\r\n');

});  

tcpSocket.listen(tcpPort, tcpHost, () => {
  log('TCP server listening on port ' + tcpPort);
});

tcpSocket.on("error", (error) => {
   log(`Server Error: ${error.message}`);
});

tcpSocket.on('data', function(data) {
   log('Server captures data...');
    try {
       var obj = JSON.parse(data.toString())
       log(JSON.stringify(obj, null, 4))
    }
    catch(e) {
       var string = data.toString()
       log(string)
    }
});
