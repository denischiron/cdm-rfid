// TCP
const net = require("net");
const { Buffer } = require('node:buffer');

// UDP
const dgram = require('node:dgram');

/**************************************************/
// TCP Params :
const hosts = [ "192.168.88.253" ];
const tcpPort = 1300;

// UDP Params :
const udpHost = "localhost";
const udpPort = 41234;

/**************************************************/


const log = function(data) {
    const timeMySQL = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log(timeMySQL + ": " + data);
}



// INSTALL as WINDOWS SERVICE :  qckwinsvc2 install
// DEMARRAGE :  qckwinsvc2 start name="TCP_tag_listener"


// Trame du boitier RFID
// STX 02
// SEQ 00
// DADD 00
// CMD 99
// DATA LENGTH 01
// TIME 00
// Pas de DATA
// BCC 00
// ETX 03

// Si Tag : 020100 05 00 1d64fb17 0003
// Si pas de Tag (length = 1) : 020100 01 11 0003

const getTagIdFromTagData = function(tag) {

    const STX  = tag.substr(0, 2);
    const SEQ  = tag.substr(2, 2);
    const DADD = tag.substr(4, 2);
    const DATA_LENGTH = parseInt(tag.substr(6, 2));
    const STATUS = tag.substr(8, 2);

    const dataLength = 2 * (DATA_LENGTH - 1);

    if (dataLength <= 1) {
        return "N/A";
    }

    const dataEndPosition = 10 + dataLength;

    const DATA = tag.substr(10, dataLength);
    const BCC = tag.substr(dataEndPosition, 2);
    const ETX = tag.substr(dataEndPosition + 2, 2);

    return DATA;
};

const prepareCommand = function(commandID, dataAsArray = [], sequenceID = "00") {

    const dataLength = dataAsArray.length + 1;
    const dataLengthAsString = (dataLength < 10 ? "0" : "") + dataLength

    const trameFirstParts = [
        "02",       // STX (start)
        sequenceID, // SEQ
        "00",       // DADD
        commandID,
        dataLengthAsString,
        "00",       // TIME
    ];

    // log(trameFirstParts, dataAsArray);

    const trameParts = trameFirstParts.concat(dataAsArray);
    trameParts.push("00"); // BCC (checksum)
    trameParts.push("03"); // EXT (end)

    return trameParts.join('');
};

class HostStateManager {

    constructor(id, host, port = 1300) {
        this.id = id;
        this.host = host;
        this.port = port;
        this.state = "N/A";

        this.notifyStateChange(this.state);
    }

    getState() {
        const t = this;
        let timeout;

        const client = net.createConnection(this.port, this.host, () => {

            // log("Connected");

            // Trame RFID ID_CAPT :
            // Commande 98 : Récupère l'ID du tag près de l'antenne :
            const command = prepareCommand("98")

            // Sends message to RFID antenna :
            const message = Buffer.from(command, "hex");
            client.write(message);
        });

        client.on("data", (data) => {

            // Ancien état : ID d'un tag ou "N/A"
            const previousState = t.state;

            // Result from RFID antenna
            const message = data.toString('hex');
            const currentState = getTagIdFromTagData(message);

            t.state = currentState;

            if (currentState !== previousState) {
                t.notifyStateChange(currentState, previousState);
            }

            // Nouveau appel de la commande de l'antenne :
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(function() {
                t.getState();
            }, 250);

            client.end();
        });

        client.on("error", (error) => {
            log(`Error: ${error.message}`);
        });

        client.on("close", () => {
            // log("Connection closed");
        });
    }

    notifyStateChange(currentState, previousState) {

        log(`NEW STATE id= ${this.id} : ${currentState}`);

        // UDP Socket :
        const message = Buffer.from(this.id + ":" + currentState);
        const client = dgram.createSocket('udp4');
        client.send(message, udpPort, udpHost, (err) => {
            client.close();
        });
    }
}

// Initialisation :
const hostStateManagers = [];
let i = 0;
for (const host of hosts) {
    hostStateManagers[host] = new HostStateManager(i++, host, tcpPort);
}

for (const host in hostStateManagers) {
    hostStateManagers[host].getState();
}
