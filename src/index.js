const DEBUG = true;
let a;

const HOST = '127.0.0.1:8000';
const instance = axios.create({
    baseURL: `http://${HOST}/api`,
    timeout: 20000,
});
const APPS = 'apps';
const DEFAULT_APPS = 'defaultApps';
const SEARCH_AND_INDEX = 'searchAndIndex';
const HOME = 'home';
const SETTINGS = 'settings';
const ABOUT = 'about';

function log(message) {
    if (DEBUG) {
        console.log(message);
    }
}

function getStartPage() {
    let hash = location.hash;
    if (_.includes(hash, '#')){
        hash = hash.substr(1);
    } else {
        hash = HOME;
    }

    return hash;

    // switch (hash) {
    //     case APPS:
    //         a.switchTab(APPS); break;
    //     case DEFAULT_APPS:
    //         a.switchTab(DEFAULT_APPS); break;
    //     case SEARCH_AND_INDEX:
    //         a.switchTab(SEARCH_AND_INDEX); break;
    //     case SETTINGS:
    //         a.switchTab(SETTINGS); break;
    //     case PRIVACY:
    //         a.switchTab(PRIVACY); break;
    //     default:
    //         a.switchTab(HOME);
    // }
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
            historyIndex: 0,
            viewing: getStartPage(),
            apps: [],
            addAppVisible: false,
            appName: '',
            appCommand: '',
            settings: [],
            toIndex: ['Documents', 'Downloads', 'Music', 'Pictures'],
        },
        watch: {
          messageQueue: () => {
              a.historyIndex = a.messageQueue.length - 1
          }
        },
        computed: {

        },
        methods: {
            onTextReady: async () => {
                if (!a.text || a.loading || a.listening) {
                    return
                }
                a.loading = true;
                try {
                    const message = buildMessage(ME, a.text);
                    a.messageQueue.push(message);
                    a.text = "";
                    switch (a.stepNumber) {
                        case 1: await a.doFirstStepAction(message); break;
                        case 2: await a.doSecondStepAction(message); break;
                        default: log('default');
                    }
                }
                catch (e) {
                    log(e);
                    a.messageQueue.push(buildMessage(ELIZA, "Didn't get that."));
                    log("resetting...");
                    a.reset();
                } finally {
                    a.loading = false;
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
                    else {
                        a.messageQueue.push(buildMessage(ELIZA, "Didn't get that."));
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
            onKeyDown: (e) => {
                if (a.loading || a.listening) {
                    return
                }
                e = e || window.event;
                if (e.which === 38) {
                    if (a.messageQueue.length) {
                        if (a.historyIndex <= 0) {
                            a.historyIndex = a.messageQueue.length - 2;
                        } else {
                            a.historyIndex -= 2;
                        }
                        if (a.messageQueue[a.historyIndex]) {
                            a.text = a.messageQueue[a.historyIndex].body;
                        }
                    }
                }
            },
            switchTab: async (newTab) => {
                a.viewing = newTab;
                if (newTab === APPS){
                    if (!a.apps.length) {
                        try {
                            const response = await instance.get('/apps');
                            a.apps = response.data;
                        } catch (e) {
                            log(e);
                        }
                    }
                }
            },
            addApp: async () => {
                if (a.addAppVisible) {
                    try {
                        let response = await instance.post('/apps', {name: a.appName, command: a.appCommand});
                        a.appName = '';
                        a.appCommand = '';
                        a.addAppVisible = false;
                        response = await instance.get('/apps');
                        a.apps = response.data;
                    } catch (e) {
                        log(e);
                    }
                } else {
                    a.addAppVisible = true;
                }

            },
            triggerIndex: async () => {
                try {
                    const response = await instance.post('/index');
                    mdtoast(response.data.message);
                } catch (e) {
                    mdtoast("Could not start indexing. Retry later");
                }
            },
            deleteIndex: async () => {
                try {
                    const response = await instance.delete('/index');
                    mdtoast(response.data.message);
                } catch (e) {
                    mdtoast("Could not update indices. Retry later");
                }
            },
        }
    });
}

window.addEventListener("load", function(){
    init();
});
