const net = require("net");
const { Buffer } = require('node:buffer');

const host = "192.168.1.160";
const port = 1300;




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


// RETOUR de la commande MANUEL/AUTO (13) : 02 00 00 01 00 00 03

const getResultFromData = function(tag) {

    const STX  = tag.substr(0, 2);
    const SEQ  = tag.substr(2, 2);
    const DADD = tag.substr(4, 2);
    const DATA_LENGTH = parseInt(tag.substr(6, 2));
    const DATA = tag.substr(8, 2);
    const BCC = tag.substr(10, 2);
    const ETX = tag.substr(12, 2);

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

    // console.log(trameFirstParts, dataAsArray);

    const trameParts = trameFirstParts.concat(dataAsArray);
    trameParts.push("00"); // BCC (checksum)
    trameParts.push("03"); // EXT (end)

    return trameParts.join('');
};

const client = net.createConnection(port, host, () => {

    console.log("Connected");

    // 13 : Mode automatique
    // 020000130200010003
    const tag = prepareCommand("13", [ "01" ]);

    // 13 : Mode manuel
    // const tag = prepareCommand("13", [ "00" ]);

    // Sends message to RFID antenna :
    const message = Buffer.from(tag, "hex");
    client.write(message);
});

client.on("data", (data) => {

    // Receives result from RFID antenna
    const message = data.toString('hex');
    console.log(`RETOUR : ${message}`);

    const result = getResultFromData (message);
    console.log(`RESULT: ${result} ` + (result === "00" ? "Success" : "Error"));

    client.end();
});

client.on("error", (error) => {
    console.log(`Error: ${error.message}`);
});

client.on("close", () => {
    console.log("Connection closed");
});
