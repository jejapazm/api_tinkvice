const functions = require('firebase-functions');
const express = require('express');
const admin = require('firebase-admin');
const app = express();

const serviceAccount = require("./credentials.json");
const { event } = require('firebase-functions/lib/providers/analytics');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://backendapptinkvice.firebaseio.com",
});

var newData;

exports.messageTrigger = functions.firestore.document('Alerts/{alertId}').onCreate(async (snapshot, context) => {
    if(snapshot.empty) {
        console.log('No Devices');
        return;
    }
    var tokens = [];
    newData = snapshot.data();

    const deviceTokens = await admin
        .firestore()
        .collection('Devices')
        .where("network_id", "==", newData.network_id)
        .get();
    
    for(var token of deviceTokens.docs) {
        tokens.push(token.data().device_token);
    }

    var payload = {
        notification: {
            title: 'Alerta!', 
            body: (newData.type === "0") 
                    ?`Niveles de aforo permitidos en ${newData.area}`
                    :`Se ha detectado aglomeración en ${newData.area}`, 
            sound: 'default'
        },
        data : {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            message: `area: ${newData.area}, hour: ${newData.hour}, date: ${newData.date}, device_number: ${newData.device_number}, type: ${newData.type}`
        }
    }
    try {
        const response = await admin.messaging().sendToDevice(tokens, payload);
        console.log('Notification sent succesfully')

    } catch (error) {
        console.log('Error sending notifications')
    }
});


app.use(require('./routes/networks.routes'))
app.use(require('./routes/wlcs.routes'))
app.use(require('./routes/users.routes'))
app.use(require('./routes/aps.routes'))
app.use(require('./routes/devices.routes'))
app.use(require('./routes/images.routes'))
app.use(require('./routes/alerts.routes'))

exports.app = functions.https.onRequest(app);