const DEBUG = true;
let a;

const instance = axios.create({
    baseURL: 'localhost:5000/api/actions',
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
                a.messageQueue.push(buildMessage(ME, a.text));
                switch (a.stepNumber) {
                    case 1: a.doFirstStepAction(); break;
                    case 2: a.doSecondStepAction(); break;
                    default: a.doFirstStepAction(); break;
                }
            },
            doFirstStepAction: async () => {
                try {
                    const result = await instance.post('', a.message);
                    const {message, nextStepNumber, activeActionId} = result.data;
                    a.messageQueue.push(message);
                    a.text = '';
                    if (nextStepNumber === 2) {
                        a.stepNumber = nextStepNumber;
                        a.activeActionId = activeActionId;
                    } else {
                        a.activeActionId = 0;
                    }
                } catch (e) {
                    a.messageQueue.pop();
                    mdtoast('Please retry', { duration: 3000, type: mdtoast.INFO });
                }
            },
            doSecondStepAction: async () => {
                try {
                    const result = await instance.post(`?activeActionId=${a.activeActionId}&stepNumber=${a.stepNumber}`, a.message);
                    const {message, nextStepNumber} = result.data;
                    a.messageQueue.push(message);
                    a.text = '';
                    if (nextStepNumber === 1) {
                        a.stepNumber = nextStepNumber;
                        a.activeActionId = 0;
                    }
                } catch (e) {
                    a.messageQueue.pop();
                    mdtoast('Please retry', { duration: 3000, type: mdtoast.INFO });
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
