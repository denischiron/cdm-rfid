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

    // console.log(trameFirstParts, dataAsArray);

    const trameParts = trameFirstParts.concat(dataAsArray);
    trameParts.push("00"); // BCC (checksum)
    trameParts.push("03"); // EXT (end)

    return trameParts.join('');
};

const client = net.createConnection(port, host, () => {

    console.log("Connected");

    // Trame RFID ID_CAPT :
    //
    // commande 0x98

    // 98 : Récupère l'ID du tag près de l'antenne :
    // "0201009801000003";
    const tag = prepareCommand("98")

    // 99 : Récupère le type et l'ID du tag près de l'antenne :
    // "0201009901000003";
    // const tag = prepareCommand("99")

    // 13 : Mode automatique
    // 020000130200010003
    // const tag = prepareCommand("13", [ "01" ]);

    // 13 : Mode manuel
    // const tag = prepareCommand("13", [ "00" ]);

    // Sends message to RFID antenna :
    const message = Buffer.from(tag, "hex");
    client.write(message);
});

client.on("data", (data) => {

    // Receives result from RFID antenna
    const message = data.toString('hex');
    const tag = getTagIdFromTagData(message);

    console.log(`TAG : ${tag}`);

    client.end();
});

client.on("error", (error) => {
    console.log(`Error: ${error.message}`);
});

client.on("close", () => {
    console.log("Connection closed");
});
