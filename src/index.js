const DEBUG = true;
let a;

const HOST = '127.0.0.1:8000';
const instance = axios.create({
    baseURL: `http://${HOST}/api`,
    timeout: 1000,
});

function log(message) {
    if (DEBUG) {
        console.log(message);
    }
}

function setupSocket(onMessageReady) {
    let socket = new WebSocket(`ws://${HOST}/ws/subscribe`);
    socket.onopen = () => log("open");
    socket.onclose = () => log("close");
    socket.onerror = (e) => log(e);
    socket.onmessage = onMessageReady;
}

function listenForKeyword() {
    try {
        instance.post('listen/generic');
    } catch (e) {
        log(e);
    }
}

function init() {
    setupSocket((response) => {
        let data = JSON.parse(response.data);
        a.onMessageReady(data['message'], data['errored']);
    });
    a = new Vue({
        el: '#app',
        data: {
            ELIZA,
            loading: false,
            messageQueue: [
                buildMessage(),
            ],
            activeActionId: 0,
            stepNumber: 1,
            text: '',
            listening: false,
        },
        computed: {

        },
        methods: {
            onTextReady: () => {
                if (!a.text) {
                    return
                }
                this.loading = true;
                try {
                    const message = buildMessage(ME, a.text);
                    a.messageQueue.push(message);
                    switch (a.stepNumber) {
                        case 1: a.doFirstStepAction(message); break;
                        case 2: a.doSecondStepAction(message); break;
                        default: log('default');
                    }
                }
                catch (e) {
                    log(e);
                    log("resetting...");
                    a.reset();
                } finally {
                    this.loading = false;
                }
            },
            doFirstStepAction: async (myMessage) => {
                try {
                    const result = await instance.post('/actions/1', {message: myMessage});
                    const {message: messageBody, nextStepNumber, activeActionId} = result.data;
                    a.messageQueue.push(buildMessage(ELIZA, messageBody));
                    if (nextStepNumber === 2) {
                        a.stepNumber = nextStepNumber;
                        a.activeActionId = activeActionId;
                    } else {
                        a.activeActionId = 0;
                    }
                } catch (e) {
                    log(e);
                    if (e && e.response && e.response.data && e.response.data.message) {
                        a.messageQueue.push(buildMessage(ELIZA, e.response.data.message));
                    }
                } finally {
                    a.text = '';
                }
            },
            doSecondStepAction: async (myMessage) => {
                try {
                    const result = await instance.post('/actions/2', {message: myMessage, activeActionId: a.activeActionId});
                    const {message: messageBody, nextStepNumber} = result.data;
                    a.messageQueue.push(buildMessage(ELIZA, messageBody));
                    if (nextStepNumber === 1) {
                        a.stepNumber = nextStepNumber;
                        a.activeActionId = 0;
                    }
                } catch (e) {
                    log(e);
                    if (e && e.response && e.response.data && e.response.data.message) {
                        a.messageQueue.push(buildMessage(ELIZA, e.response.data.message));
                    }
                } finally {
                    a.text = '';
                }
            },
            isEmpty: (text) => {
                return text.length < 1;
            },
            onMessageReady: (message, errored) => {
              if (!errored) {
                  a.text = message;
                  a.onTextReady();
              } else {
                  a.messageQueue.push(buildMessage(ELIZA, message));
              }
              a.listening = false
            },
            reset: () => {
                a.text = '';
                a.activeActionId = 0;
                a.stepNumber = 1;
            },
            listenForKeyword: () => {
                a.listening = true;
                listenForKeyword();
                // setTimeout(() => a.listening = false, 20000);
            },
        }
    });
}

window.addEventListener("load", function(){
    init();
});
