const DEBUG = true;
let a;

const instance = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/actions',
    timeout: 1000,
});

function log(message) {
    if (DEBUG) {
        console.log(message);
    }
}

function init() {
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
        },
        computed: {

        },
        methods: {
            onTextReady: () => {
                // todo send request, get response and id
                const message = buildMessage(ME, a.text);
                a.messageQueue.push(message);
                switch (a.stepNumber) {
                    case 1: a.doFirstStepAction(message); break;
                    case 2: a.doSecondStepAction(message); break;
                    default: log('default');
                }
            },
            doFirstStepAction: async (myMessage) => {
                try {
                    const result = await instance.post('/1', {message: myMessage});
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
                    const result = await instance.post('/2', {message: myMessage, activeActionId: a.activeActionId});
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
        }
    });
}

window.addEventListener("load", function(){
    init();
});
