if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.error('Service Worker Registration Failed:', err);
        });
    });
}

let stories = {};
let currentStoryId = null;
let isEditMode = true;
let imageTargetContext = null;
let isTyping = false;

let deferredPrompt = null;
const btnInstallPwa = document.getElementById('btnInstallPwa');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstallPwa) {
        btnInstallPwa.style.display = 'flex';
    }
});

if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
        if (!deferredPrompt) {
            showCustomAlert("App Installed", "The app is already installed or your browser doesn't support direct installation.", "info");
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('PWA installation accepted');
        }
        deferredPrompt = null;
        btnInstallPwa.style.display = 'none';
    });
}

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (btnInstallPwa) {
        btnInstallPwa.style.display = 'none';
    }
});

const svgIcons = {
    call: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:middle;"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    warn: `<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
};

const contactsList = document.getElementById('contactsList');
const searchInput = document.getElementById('searchInput');
const emptySearch = document.getElementById('emptySearch');
const activeName = document.getElementById('activeName');
const activeAvatar = document.getElementById('activeAvatar');
const activeStatus = document.getElementById('activeStatus');
const chatMessages = document.getElementById('chatMessages');
const chatPanel = document.getElementById('chatPanel');
const btnBack = document.getElementById('btnBack');
const btnMoreMenu = document.getElementById('btnMoreMenu');
const dropdownMenu = document.getElementById('dropdownMenu');
const modeToggleLabel = document.getElementById('modeToggleLabel');
const playChoicesContainer = document.getElementById('playChoicesContainer');

const modalNewCharacter = document.getElementById('modalNewCharacter');
const modalProfile = document.getElementById('modalProfile');
const modalViewProfile = document.getElementById('modalViewProfile');
const modalWallpaper = document.getElementById('modalWallpaper');
const modalTree = document.getElementById('modalTree');
const modalCallSim = document.getElementById('modalCallSim');
const modalCustomConfirm = document.getElementById('modalCustomConfirm');
const modalCustomAlert = document.getElementById('modalCustomAlert');
const modalCustomPrompt = document.getElementById('modalCustomPrompt');
const modalOptionPicker = document.getElementById('modalOptionPicker');
const modalImageSource = document.getElementById('modalImageSource');
const modalFullscreenImage = document.getElementById('modalFullscreenImage');
const modalLockForm = document.getElementById('modalLockForm');

let onConfirmCallback = null;
let onCancelCallback = null;
let onPromptCallback = null;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getLnrcKey() {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", enc.encode("LNRC_ENGINE_KEY_2026_CFM_SECRET"));
    return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptToLnrcHex(storyData) {
    const enc = new TextEncoder();
    const jsonStr = JSON.stringify(storyData);
    const key = await getLnrcKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(jsonStr)
    );
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);
    
    let hexStr = "";
    for (let i = 0; i < combined.length; i++) {
        hexStr += combined[i].toString(16).padStart(2, "0");
    }
    return hexStr;
}

async function decryptLnrcHex(hexStr) {
    const cleanHex = hexStr.trim().replace(/\s+/g, "");
    if (!cleanHex || cleanHex.length < 32 || cleanHex.length % 2 !== 0) {
        throw new Error("Invalid file format.");
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    const iv = bytes.slice(0, 12);
    const dataBytes = bytes.slice(12);
    const key = await getLnrcKey();
    
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        dataBytes
    );
    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBuffer);
    return JSON.parse(jsonStr);
}

function ensureMessageIds(story) {
    if (!story || !story.nodes) return;
    let counter = 1;
    Object.values(story.nodes).forEach(node => {
        if (node.messages) {
            node.messages.forEach(m => {
                if (!m.id) {
                    m.id = "msg_" + Date.now() + "_" + (counter++);
                }
            });
        }
    });
}

function getCurrentStory() {
    const story = stories[currentStoryId];
    if (story) ensureMessageIds(story);
    return story;
}

function loadFromStorage() {
    const data = localStorage.getItem("cfm_stories");
    if (data) {
        try {
            stories = JSON.parse(data);
        } catch (e) {
            stories = {};
        }
    }
    if (Object.keys(stories).length === 0) {
        createDefaultStory();
    } else {
        currentStoryId = Object.keys(stories)[0];
    }
}

function saveToStorage() {
    localStorage.setItem("cfm_stories", JSON.stringify(stories));
}

function createDefaultStory() {
    const id = "cf_1";
    stories[id] = {
        id: id,
        name: "Aruna",
        subtitle: "Someone",
        onlineStatus: "Online",
        avatar: "AR",
        avatarImg: "",
        wallpaper: "",
        enableCalls: true,
        isLocked: true,
        creatorName: "CF Developer",
        createdDate: new Date().toISOString().split('T')[0],
        description: "Official sample character for Chat Fiction Maker.",
        permission: "none",
        startNode: "node_01",
        currentNode: "node_01",
        history: [],
        nodes: {
            "node_01": {
                messages: [
                    { id: "msg_a1", type: "text", side: "left", text: ".... . .-.. .-.. --- --..-- / -.. . .- .-. -.-.--" }
                ],
                choices: [
                    {
                        label: ".. / -- .. ... ... / -.-- --- .. ...-.-",
                        to: "node_02"
                    }
                ]
            },
            "node_02": {
                messages: [
                    { id: "msg_a2", type: "text", side: "left", text: ".-.-.- .-.-.- .-.-.-" },
                    { id: "msg_a3", type: "text", side: "left", text: "It has been so long since we last spoke..." }
                ],
                choices: []
            }
        }
    };
    currentStoryId = id;
    saveToStorage();
}

function showCustomAlert(title, message, iconSvgKey = "info") {
    document.getElementById('alertSvgWrap').innerHTML = svgIcons[iconSvgKey] || svgIcons.info;
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertDesc').textContent = message;
    modalCustomAlert.classList.add('show');
}

function showCustomConfirm(title, message, iconSvgKey, onYes, onNo = null) {
    document.getElementById('confirmSvgWrap').innerHTML = svgIcons[iconSvgKey] || svgIcons.warn;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmDesc').textContent = message;
    onConfirmCallback = onYes;
    onCancelCallback = onNo;
    modalCustomConfirm.classList.add('show');
}

function showCustomPrompt(title, defaultText, onSave) {
    document.getElementById('promptTitle').textContent = title;
    document.getElementById('promptInputText').value = defaultText || "";
    onPromptCallback = onSave;
    modalCustomPrompt.classList.add('show');
}

function showOptionPicker(title, options, onSelect) {
    document.getElementById('pickerTitle').textContent = title;
    const list = document.getElementById('pickerList');
    list.innerHTML = '';
    options.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.textContent = opt.label;
        item.addEventListener('click', () => {
            modalOptionPicker.classList.remove('show');
            onSelect(opt.value);
        });
        list.appendChild(item);
    });
    modalOptionPicker.classList.add('show');
}

function showImageSourceSelector() {
    modalImageSource.classList.add('show');
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function showTypingIndicator() {
    hideTypingIndicator();
    activeStatus.textContent = "Typing...";
    const bubble = document.createElement('div');
    bubble.id = 'typingBubbleIndicator';
    bubble.className = 'message received typing-indicator';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(bubble);
    scrollToBottom();
}

function hideTypingIndicator() {
    const existing = document.getElementById('typingBubbleIndicator');
    if (existing) existing.remove();
    const story = getCurrentStory();
    if (story) {
        activeStatus.textContent = story.isLocked ? (story.onlineStatus || "Online") : (isEditMode ? "Editor Mode" : "Read Mode");
    }
}

function getNextNodeId(story) {
    let max = 0;
    Object.keys(story.nodes).forEach(key => {
        let match = key.match(/^node_(\d+)$/);
        if (match) {
            let val = parseInt(match[1], 10);
            if (val > max) max = val;
        }
    });
    let nextVal = max + 1;
    let padded = nextVal < 10 ? "0" + nextVal : "" + nextVal;
    return "node_" + padded;
}

function renderContacts() {
    contactsList.innerHTML = '';
    const storyList = Object.values(stories);
    
    if (storyList.length === 0) {
        contactsList.innerHTML = '<div class="empty-search" style="display:block;">No characters found. Click + New.</div>';
        return;
    }

    storyList.forEach(story => {
        const item = document.createElement('div');
        item.className = `contact-item ${story.id === currentStoryId ? 'active' : ''}`;
        
        let avatarStyle = story.avatarImg ? `background-image: url('${story.avatarImg}'); color: transparent;` : '';
        let lockedTag = story.isLocked ? `<span class="badge-locked">Locked</span>` : '';

        item.innerHTML = `
            <div class="avatar" style="${avatarStyle}">${story.avatarImg ? '' : story.avatar}</div>
            <div class="contact-info">
                <div class="contact-name">${story.name} ${lockedTag}</div>
                <div class="contact-desc">${story.subtitle || (story.isLocked ? 'Active Character' : 'Edit Mode')}</div>
            </div>
        `;
        item.addEventListener('click', () => switchStory(story.id));
        contactsList.appendChild(item);
    });
}

function renderChat() {
    isTyping = false;
    hideTypingIndicator();
    chatMessages.innerHTML = '';
    const story = getCurrentStory();
    if (!story) {
        activeName.textContent = "Select Story";
        activeAvatar.textContent = "--";
        activeAvatar.style.backgroundImage = '';
        activeStatus.textContent = "-";
        return;
    }

    if (story.wallpaper) {
        chatPanel.style.backgroundImage = `url('${story.wallpaper}')`;
        chatPanel.style.backgroundColor = 'transparent';
    } else {
        chatPanel.style.backgroundImage = '';
        chatPanel.style.backgroundColor = '#f8fafc';
    }

    activeName.textContent = story.name;
    if (story.avatarImg) {
        activeAvatar.style.backgroundImage = `url('${story.avatarImg}')`;
        activeAvatar.textContent = '';
    } else {
        activeAvatar.style.backgroundImage = '';
        activeAvatar.textContent = story.avatar;
    }

    const perm = story.permission || 'full';
    if (story.isLocked && perm !== 'full') {
        isEditMode = false;
    }

    activeStatus.textContent = story.isLocked ? (story.onlineStatus || "Online") : (isEditMode ? "Editor Mode" : "Read Mode");
    modeToggleLabel.textContent = isEditMode ? "Read Mode" : "Edit Mode";
    document.getElementById('btnToggleEditMode').textContent = isEditMode ? "Read Mode" : "Edit Mode";
    document.getElementById('editAddButtonsRow').style.display = isEditMode ? 'flex' : 'none';

    document.body.classList.toggle('play-mode', !isEditMode);

    updateDropdownMenuVisibility(story);
    renderMessagesPath();
    scrollToBottom();
}

function updateDropdownMenuVisibility(story) {
    const isLocked = story && story.isLocked;
    const perm = (story && story.permission) ? story.permission : 'full';

    document.getElementById('menuViewProfile').style.display = 'flex';
    
    if (isLocked) {
        document.getElementById('menuEditProfile').style.display = (perm === 'none') ? 'none' : 'flex';
        document.getElementById('menuToggleMode').style.display = (perm === 'full') ? 'flex' : 'none';
        document.getElementById('menuLockCharacter').style.display = 'none';
    } else {
        document.getElementById('menuEditProfile').style.display = 'flex';
        document.getElementById('menuToggleMode').style.display = 'flex';
        document.getElementById('menuLockCharacter').style.display = 'flex';
    }
    document.getElementById('menuExport').style.display = 'flex';
}

function reconstructHistoryToNode(targetNodeId) {
    const story = getCurrentStory();
    if (!story) return [];
    
    if (targetNodeId === story.startNode) {
        const startNode = story.nodes[story.startNode];
        return startNode && startNode.messages ? startNode.messages.map(m => ({ ...m, nodeId: story.startNode })) : [];
    }
    
    let visited = new Set();
    let path = [];
    
    function dfs(currNodeId) {
        if (currNodeId === targetNodeId) return true;
        if (visited.has(currNodeId)) return false;
        visited.add(currNodeId);
        
        const node = story.nodes[currNodeId];
        if (!node || !node.choices) return false;
        
        for (let i = 0; i < node.choices.length; i++) {
            const choice = node.choices[i];
            path.push({ nodeId: currNodeId, choiceIndex: i, choice: choice });
            if (dfs(choice.to)) return true;
            path.pop();
        }
        return false;
    }
    
    if (!dfs(story.startNode)) return null;
    
    let history = [];
    path.forEach(step => {
        const node = story.nodes[step.nodeId];
        if (node && node.messages) {
            node.messages.forEach(m => {
                history.push({ ...m, nodeId: step.nodeId });
            });
        }
        history.push({
            type: "text",
            side: "right",
            text: step.choice.label,
            sourceNode: step.nodeId,
            targetNodeId: step.choice.to,
            choiceIndex: step.choiceIndex
        });
    });
    
    const targetNode = story.nodes[targetNodeId];
    if (targetNode && targetNode.messages) {
        targetNode.messages.forEach(m => {
            history.push({ ...m, nodeId: targetNodeId });
        });
    }

    return history;
}

function renderMessagesPath() {
    const story = getCurrentStory();
    if (!story) return;

    if (!story.history || story.history.length === 0) {
        const newHist = reconstructHistoryToNode(story.currentNode);
        story.history = newHist || [];
    }

    story.history.forEach((msg, idx) => {
        appendBubbleElement(msg, idx);
    });

    renderChoicesPanel();
}

function appendBubbleElement(msg, idx) {
    const story = getCurrentStory();
    const perm = story.permission || 'full';
    const canEditNodes = isEditMode && (!story.isLocked || perm === 'full');

    const row = document.createElement('div');
    const typeClass = msg.side === 'left' ? 'received' : (msg.side === 'right' ? 'sent' : 'system');
    
    row.className = `message ${typeClass}`;
    if (canEditNodes) {
        if (msg.side === 'right') {
            row.classList.add('editable-right');
        } else {
            row.classList.add('editable-left');
        }
    }

    if (msg.type === 'image') {
        row.innerHTML = `<img src="${msg.text}" class="msg-img-tag" alt="Image">`;
        row.querySelector('.msg-img-tag').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('fullscreenImgTag').src = msg.text;
            modalFullscreenImage.classList.add('show');
        });
    } else if (msg.type === 'call_history') {
        const details = msg.callDetails || { media: "voice", status: "completed", duration: "00:00" };
        const isMissed = details.status === "missed";
        const iconSVG = details.media === "video" ? svgIcons.video : svgIcons.call;
        const color = isMissed ? "#ef4444" : "#10b981";
        const statusTxt = isMissed ? "Missed Call" : `Call Ended (${details.duration})`;
        
        row.innerHTML = `<div class="msg-call-tag" style="color:${color};">${iconSVG} <span>${statusTxt}</span></div>`;
    } else {
        row.innerHTML = `<div>${msg.text}</div>`;
    }

    row.addEventListener('click', () => {
        if (isTyping) return;
        if (canEditNodes) {
            if (msg.side === 'right') {
                showCustomPrompt("Create New Branch Choice", "", (newText) => {
                    if (!newText.trim()) return;
                    branchFromRightChoice(msg, newText.trim());
                });
            } else {
                openMessageEditorAction(msg, idx);
            }
        } else {
            showCustomConfirm("Rewind Here?", "Do you want to rewind the story back to this message point?", "info", () => {
                rewindToMessageIndex(idx);
            });
        }
    });

    chatMessages.appendChild(row);
}

function renderChoicesPanel() {
    playChoicesContainer.innerHTML = '';
    if (isTyping) return;

    const story = getCurrentStory();
    if (!story) return;

    const activeNode = story.nodes[story.currentNode];
    if (!activeNode || !activeNode.choices || activeNode.choices.length === 0) return;

    activeNode.choices.forEach((choice, choiceIdx) => {
        const btn = document.createElement('button');
        btn.className = 'btn-play-choice';
        btn.textContent = choice.label;
        btn.addEventListener('click', () => handleChoiceSelect(choice, choiceIdx));
        playChoicesContainer.appendChild(btn);
    });
}

async function handleChoiceSelect(choice, choiceIdx) {
    if (isTyping) return;
    const story = getCurrentStory();
    if (!story) return;

    isTyping = true;
    playChoicesContainer.innerHTML = '';

    story.history.push({
        type: 'text',
        side: 'right',
        text: choice.label,
        sourceNode: story.currentNode,
        targetNodeId: choice.to,
        choiceIndex: choiceIdx
    });

    story.currentNode = choice.to;
    saveToStorage();

    appendBubbleElement(story.history[story.history.length - 1], story.history.length - 1);
    scrollToBottom();

    const targetNode = story.nodes[choice.to];
    if (targetNode && targetNode.messages && targetNode.messages.length > 0) {
        for (const m of targetNode.messages) {
            await sleep(600);
            
            if (m.side === 'left') {
                showTypingIndicator();
                let textLen = (m.type === 'text' && m.text) ? m.text.length : 20;
                let delayMs = Math.min(Math.max(textLen * 35, 1200), 5000);
                await sleep(delayMs);
                hideTypingIndicator();
            } else if (m.side === 'center') {
                await sleep(800);
            } else {
                await sleep(500);
            }

            const newMsg = { ...m, nodeId: choice.to };
            story.history.push(newMsg);
            appendBubbleElement(newMsg, story.history.length - 1);
            saveToStorage();
            scrollToBottom();
        }
    }

    isTyping = false;
    hideTypingIndicator();
    renderChoicesPanel();
}

function branchFromRightChoice(msg, newChoiceText) {
    const story = getCurrentStory();
    const parentNodeId = msg.sourceNode || story.currentNode;
    const parentNode = story.nodes[parentNodeId];

    if (!parentNode) return;

    const newTargetNodeId = getNextNodeId(story);
    const newMsgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
    story.nodes[newTargetNodeId] = {
        messages: [{ id: newMsgId, type: "text", side: "left", text: "Character reply..." }],
        choices: []
    };

    if (!parentNode.choices) parentNode.choices = [];
    parentNode.choices.push({
        label: newChoiceText,
        to: newTargetNodeId
    });

    const newHist = reconstructHistoryToNode(newTargetNodeId);
    if (newHist) {
        story.history = newHist;
        story.currentNode = newTargetNodeId;
    }

    saveToStorage();
    renderChat();
}

function openMessageEditorAction(msg, idx) {
    const story = getCurrentStory();
    showOptionPicker("Message Options", [
        { label: "Edit Message", value: "edit" },
        { label: "Delete Message", value: "delete" }
    ], (val) => {
        if (val === "edit") {
            if (msg.type === "text") {
                showCustomPrompt("Edit Message", msg.text, (newText) => {
                    if (!newText.trim()) return;
                    msg.text = newText.trim();
                    updateNodeMessageRef(msg, newText.trim());
                    saveToStorage();
                    renderChat();
                });
            } else if (msg.type === "image") {
                imageTargetContext = { type: 'edit_msg', msgRef: msg };
                showImageSourceSelector();
            }
        } else if (val === "delete") {
            deleteNodeMessageRef(msg);
            story.history.splice(idx, 1);
            saveToStorage();
            renderChat();
        }
    });
}

function updateNodeMessageRef(msg, newContent) {
    const story = getCurrentStory();
    if (!msg || !msg.nodeId || !story.nodes[msg.nodeId]) return;
    const nodeMsgs = story.nodes[msg.nodeId].messages;
    if (!nodeMsgs) return;
    const target = nodeMsgs.find(m => (m.id && m.id === msg.id) || (m.type === msg.type && m.side === msg.side && m.text === msg.text));
    if (target) {
        target.text = newContent;
    }
}

function deleteNodeMessageRef(msg) {
    const story = getCurrentStory();
    if (!msg || !msg.nodeId || !story.nodes[msg.nodeId]) return;
    const nodeMsgs = story.nodes[msg.nodeId].messages;
    if (!nodeMsgs) return;
    const idx = nodeMsgs.findIndex(m => (m.id && m.id === msg.id) || (m.type === msg.type && m.side === msg.side && m.text === msg.text));
    if (idx !== -1) {
        nodeMsgs.splice(idx, 1);
    }
}

function rewindToMessageIndex(idx) {
    const story = getCurrentStory();
    const targetMsg = story.history[idx];
    if (!targetMsg) return;

    let targetNodeId = targetMsg.targetNodeId || targetMsg.nodeId || story.startNode;
    const newHist = reconstructHistoryToNode(targetNodeId);
    
    if (newHist) {
        story.history = newHist;
        story.currentNode = targetNodeId;
    } else {
        story.history = story.history.slice(0, idx + 1);
        if (targetMsg.nodeId) story.currentNode = targetMsg.nodeId;
    }

    saveToStorage();
    renderChat();
}

function addMessageToCurrentNode(type, side, text = "", callDetails = null) {
    const story = getCurrentStory();
    if (!story) return;

    let activeNode = story.nodes[story.currentNode];
    if (!activeNode) {
        story.currentNode = story.startNode;
        activeNode = story.nodes[story.currentNode];
    }

    const msgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
    const nodeMsg = { id: msgId, type, side, text, callDetails };
    const newMsg = { ...nodeMsg, nodeId: story.currentNode };

    activeNode.messages.push(nodeMsg);
    story.history.push(newMsg);

    saveToStorage();
    renderChat();
}

function addUserBranchChoice(userText) {
    const story = getCurrentStory();
    if (!story) return;

    const activeNode = story.nodes[story.currentNode];
    const newTargetNodeId = getNextNodeId(story);
    const newMsgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);

    story.nodes[newTargetNodeId] = {
        messages: [{ id: newMsgId, type: "text", side: "left", text: "Character reply..." }],
        choices: []
    };

    if (!activeNode.choices) activeNode.choices = [];
    activeNode.choices.push({
        label: userText,
        to: newTargetNodeId
    });

    const newHist = reconstructHistoryToNode(newTargetNodeId);
    if (newHist) {
        story.history = newHist;
        story.currentNode = newTargetNodeId;
    }

    saveToStorage();
    renderChat();
}

function createNewCharacter() {
    const name = document.getElementById('inputNewName').value.trim();
    const sub = document.getElementById('inputNewSub').value.trim() || "Custom Character";
    const firstMsg = document.getElementById('inputNewFirstMsg').value.trim() || "Hello! Welcome to Chat Fiction.";

    if (!name) {
        showCustomAlert("Incomplete Form", "Please enter a character name.", "warn");
        return;
    }

    const id = "cf_" + Date.now();
    stories[id] = {
        id: id,
        name: name,
        subtitle: sub,
        onlineStatus: "Online",
        avatar: name.substring(0, 2).toUpperCase(),
        avatarImg: "",
        wallpaper: "",
        enableCalls: true,
        isLocked: false,
        creatorName: "",
        createdDate: new Date().toISOString().split('T')[0],
        description: "",
        permission: "full",
        startNode: "node_01",
        currentNode: "node_01",
        history: [],
        nodes: {
            "node_01": {
                messages: [{ id: "msg_first_" + Date.now(), type: "text", side: "left", text: firstMsg }],
                choices: []
            }
        }
    };

    document.getElementById('inputNewName').value = '';
    document.getElementById('inputNewSub').value = '';
    document.getElementById('inputNewFirstMsg').value = '';
    modalNewCharacter.classList.remove('show');

    saveToStorage();
    switchStory(id);
}

function switchStory(id) {
    currentStoryId = id;
    renderContacts();
    renderChat();
    document.body.classList.add('show-chat-mode');
}

function renderTreeModal() {
    const container = document.getElementById('treeContainer');
    container.innerHTML = '';
    const story = getCurrentStory();
    if (!story) return;

    Object.keys(story.nodes).forEach(nodeId => {
        const node = story.nodes[nodeId];
        const item = document.createElement('div');
        item.className = `tree-node-item ${nodeId === story.currentNode ? 'active' : ''}`;
        
        let startMsgText = "(Empty)";
        if (node.messages && node.messages.length > 0) {
            startMsgText = node.messages[0].text || "[Non-text message]";
        }

        let choicesHtml = '';
        if (node.choices && node.choices.length > 0) {
            choicesHtml = node.choices.map((ch, idx) => `
                <div class="tree-choice-row">
                    <span>➔ "${ch.label}" to ${ch.to}</span>
                    <button class="btn-node-act danger" onclick="deleteBranchChoice('${nodeId}', ${idx})">X</button>
                </div>
            `).join('');
        }

        let deleteNodeBtn = nodeId !== story.startNode ? 
            `<button class="btn-node-act danger" onclick="deleteNodeFromTree('${nodeId}')">Delete Node</button>` : '';

        item.innerHTML = `
            <div class="tree-node-header">
                <span>ID: ${nodeId} ${nodeId === story.currentNode ? '(Current Position)' : ''}</span>
                ${deleteNodeBtn}
            </div>
            <div>First Message: "${startMsgText}"</div>
            ${choicesHtml}
            <button class="btn-node-act jump" onclick="jumpToNodeFromTree('${nodeId}')">Jump to This Node</button>
        `;
        
        container.appendChild(item);
    });

    modalTree.classList.add('show');
}

window.deleteBranchChoice = function(nodeId, idx) {
    const story = getCurrentStory();
    if (story && story.nodes[nodeId] && story.nodes[nodeId].choices) {
        story.nodes[nodeId].choices.splice(idx, 1);
        saveToStorage();
        renderTreeModal();
    }
};

window.deleteNodeFromTree = function(nodeId) {
    const story = getCurrentStory();
    if (!story || nodeId === story.startNode) return;

    delete story.nodes[nodeId];
    Object.values(story.nodes).forEach(n => {
        if (n.choices) {
            n.choices = n.choices.filter(c => c.to !== nodeId);
        }
    });

    if (story.currentNode === nodeId) {
        story.currentNode = story.startNode;
        story.history = [];
    }

    saveToStorage();
    renderTreeModal();
    renderChat();
};

window.jumpToNodeFromTree = function(nodeId) {
    const story = getCurrentStory();
    const newHistory = reconstructHistoryToNode(nodeId);
    if (newHistory !== null) {
        story.history = newHistory;
        story.currentNode = nodeId;
        saveToStorage();
        modalTree.classList.remove('show');
        renderChat();
    } else {
        showCustomAlert("Jump Failed", "The route path to this node is not directly connected.", "warn");
    }
};

document.getElementById('btnAddCharMsg').addEventListener('click', () => {
    showCustomPrompt("Add Character Message", "", (txt) => {
        if (!txt.trim()) return;
        addMessageToCurrentNode('text', 'left', txt.trim());
    });
});

document.getElementById('btnAddUserMsg').addEventListener('click', () => {
    showCustomPrompt("Add User Choice (Branch)", "", (txt) => {
        if (!txt.trim()) return;
        addUserBranchChoice(txt.trim());
    });
});

document.getElementById('btnAddPauseMsg').addEventListener('click', () => {
    showCustomPrompt("Add Pause / Narrative", "", (txt) => {
        if (!txt.trim()) return;
        addMessageToCurrentNode('text', 'center', txt.trim());
    });
});

document.getElementById('btnAddImgMsg').addEventListener('click', () => {
    showOptionPicker("Image Sender Side", [
        { label: "Character (Left)", value: "left" },
        { label: "User (Right)", value: "right" },
        { label: "Narrative (Center)", value: "center" }
    ], (senderSide) => {
        imageTargetContext = { type: 'chat_msg', side: senderSide };
        showImageSourceSelector();
    });
});

document.getElementById('btnToggleEditMode').addEventListener('click', () => {
    const story = getCurrentStory();
    const perm = story ? (story.permission || 'full') : 'full';
    if (story && story.isLocked && perm !== 'full') return;
    isEditMode = !isEditMode;
    renderChat();
});

document.getElementById('btnResetFlow').addEventListener('click', () => {
    showCustomConfirm("Restart Flow?", "All current conversation progress will be restarted from the first message.", "warn", () => {
        const story = getCurrentStory();
        story.currentNode = story.startNode;
        story.history = [];
        const newHist = reconstructHistoryToNode(story.startNode);
        story.history = newHist || [];
        saveToStorage();
        renderChat();
    });
});

document.getElementById('btnTreeBottom').addEventListener('click', renderTreeModal);

document.getElementById('btnNewStory').addEventListener('click', () => {
    modalNewCharacter.classList.add('show');
});

document.getElementById('btnCloseNewCharacter').addEventListener('click', () => {
    modalNewCharacter.classList.remove('show');
});

document.getElementById('btnSaveNewCharacter').addEventListener('click', createNewCharacter);

document.getElementById('btnImportLnrc').addEventListener('click', () => {
    document.getElementById('fileLnrcInput').click();
});

document.getElementById('fileLnrcInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const hexText = evt.target.result;
            const imported = await decryptLnrcHex(hexText);
            if (imported && imported.id && imported.nodes) {
                imported.isLocked = true;
                if (!imported.permission) imported.permission = 'none';
                stories[imported.id] = imported;
                saveToStorage();
                switchStory(imported.id);
                showCustomAlert("Import Successful", ".LNRC file decrypted and verified successfully.", "info");
            } else {
                showCustomAlert("Import Failed", "Invalid data structure.", "warn");
            }
        } catch (err) {
            showCustomAlert("Import Failed", "The .LNRC file is corrupted, degraded, or modified unlawfully!", "warn");
        }
    };
    reader.readAsText(file);
});

btnMoreMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
});

document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
});

document.getElementById('menuViewProfile').addEventListener('click', () => {
    const story = getCurrentStory();
    if (!story) return;

    const avEl = document.getElementById('viewProfileAvatar');
    if (story.avatarImg) {
        avEl.style.backgroundImage = `url('${story.avatarImg}')`;
        avEl.textContent = '';
    } else {
        avEl.style.backgroundImage = '';
        avEl.textContent = story.avatar;
    }

    document.getElementById('viewProfileName').textContent = story.name;
    document.getElementById('viewProfileSub').textContent = story.subtitle || "Chat Fiction Character";
    document.getElementById('viewProfileCreator').textContent = story.creatorName || "Anonymous";
    document.getElementById('viewProfileDate').textContent = story.createdDate || "-";
    document.getElementById('viewProfileDesc').textContent = story.description || "No description provided.";

    const badge = document.getElementById('viewProfilePermissionBadge');
    const perm = story.permission || 'full';

    if (perm === 'none') {
        badge.textContent = "Locked (No Editing Allowed)";
        badge.className = "view-profile-badge perm-none";
    } else if (perm === 'profile_only') {
        badge.textContent = "Profile Info Editing Only";
        badge.className = "view-profile-badge perm-profile";
    } else {
        badge.textContent = "Full Editing Allowed";
        badge.className = "view-profile-badge perm-full";
    }

    modalViewProfile.classList.add('show');
});

document.getElementById('btnCloseViewProfile').addEventListener('click', () => {
    modalViewProfile.classList.remove('show');
});

document.getElementById('menuToggleMode').addEventListener('click', () => {
    const story = getCurrentStory();
    const perm = story ? (story.permission || 'full') : 'full';
    if (story && story.isLocked && perm !== 'full') return;
    isEditMode = !isEditMode;
    renderChat();
});

document.getElementById('menuExport').addEventListener('click', async () => {
    const story = getCurrentStory();
    if (!story) return;

    try {
        const exportData = JSON.parse(JSON.stringify(story));
        exportData.isLocked = true;

        const hexContent = await encryptToLnrcHex(exportData);
        const blob = new Blob([hexContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cf_${story.id}.lnrc`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showCustomAlert("Export Successful", "Character encrypted and saved as protected .LNRC file.", "info");
    } catch (err) {
        showCustomAlert("Export Failed", "An error occurred while encrypting the file.", "warn");
    }
});

document.getElementById('menuLockCharacter').addEventListener('click', () => {
    const story = getCurrentStory();
    if (!story) return;

    document.getElementById('inputLockCreator').value = story.creatorName || '';
    document.getElementById('inputLockDate').value = story.createdDate || new Date().toISOString().split('T')[0];
    document.getElementById('inputLockDesc').value = story.description || '';
    document.getElementById('selectLockPermission').value = story.permission || 'none';

    modalLockForm.classList.add('show');
});

document.getElementById('btnCancelLockForm').addEventListener('click', () => {
    modalLockForm.classList.remove('show');
});

document.getElementById('btnSaveLockForm').addEventListener('click', () => {
    const story = getCurrentStory();
    if (!story) return;

    story.creatorName = document.getElementById('inputLockCreator').value.trim() || "Anonymous";
    story.createdDate = document.getElementById('inputLockDate').value || new Date().toISOString().split('T')[0];
    story.description = document.getElementById('inputLockDesc').value.trim();
    story.permission = document.getElementById('selectLockPermission').value;
    story.isLocked = true;

    if (story.permission !== 'full') {
        isEditMode = false;
    }

    modalLockForm.classList.remove('show');
    saveToStorage();
    renderContacts();
    renderChat();

    showCustomAlert("Character Locked", "Character has been permanently saved with the specified permissions.", "lock");
});

document.getElementById('menuResetProgress').addEventListener('click', () => {
    showCustomConfirm("Restart Story?", "All current conversation progress will be restarted from the first message.", "warn", () => {
        const story = getCurrentStory();
        story.currentNode = story.startNode;
        story.history = [];
        const newHist = reconstructHistoryToNode(story.startNode);
        story.history = newHist || [];
        saveToStorage();
        renderChat();
    });
});

document.getElementById('menuDeleteContact').addEventListener('click', () => {
    const story = getCurrentStory();
    if (!story) return;

    if (story.id === 'cf_1' || story.name.toLowerCase() === 'aruna') {
        showCustomConfirm(
            "???",
            "This is all I have left. Are you sure you want to take it away?",
            "warn",
            () => {
                showCustomAlert("How cruel...", "I hope you never experience the same.", "info");
            },
            () => {
                delete stories[story.id];
                const remaining = Object.keys(stories);
                if (remaining.length > 0) {
                    currentStoryId = remaining[0];
                } else {
                    currentStoryId = null;
                }
                saveToStorage();
                renderContacts();
                renderChat();
                showCustomAlert("Alright", "Maybe it's time to forget. Thank you...", "info");
            }
        );
        return;
    }

    showCustomConfirm("Delete Character?", "Are you sure you want to permanently delete this character?", "trash", () => {
        delete stories[currentStoryId];
        const remaining = Object.keys(stories);
        if (remaining.length > 0) {
            currentStoryId = remaining[0];
        } else {
            currentStoryId = null;
        }
        saveToStorage();
        renderContacts();
        renderChat();
    });
});

document.getElementById('menuEditProfile').addEventListener('click', () => {
    const story = getCurrentStory();
    if (!story) return;

    const perm = story.permission || 'full';
    if (story.isLocked && perm === 'none') {
        showCustomAlert("Access Denied", "Character creator disabled profile editing.", "warn");
        return;
    }

    document.getElementById('inputProfileName').value = story.name;
    document.getElementById('inputProfileSub').value = story.subtitle || '';
    document.getElementById('inputProfileOnline').value = story.onlineStatus || 'Online';
    document.getElementById('selectEnableCalls').value = story.enableCalls ? "true" : "false";

    const prev = document.getElementById('profileAvatarPreview');
    if (story.avatarImg) {
        prev.style.backgroundImage = `url('${story.avatarImg}')`;
        prev.textContent = '';
    } else {
        prev.style.backgroundImage = '';
        prev.textContent = story.avatar;
    }

    modalProfile.classList.add('show');
});

document.getElementById('btnSelectAvatarSrc').addEventListener('click', () => {
    imageTargetContext = { type: 'profile_avatar' };
    showImageSourceSelector();
});

document.getElementById('btnSaveProfile').addEventListener('click', () => {
    const story = getCurrentStory();
    if (!story) return;

    story.name = document.getElementById('inputProfileName').value.trim() || story.name;
    story.subtitle = document.getElementById('inputProfileSub').value.trim();
    story.onlineStatus = document.getElementById('inputProfileOnline').value.trim();
    story.enableCalls = document.getElementById('selectEnableCalls').value === "true";

    modalProfile.classList.remove('show');
    saveToStorage();
    renderContacts();
    renderChat();
});

document.getElementById('btnCloseProfile').addEventListener('click', () => {
    modalProfile.classList.remove('show');
});

document.getElementById('menuWallpaper').addEventListener('click', () => {
    const story = getCurrentStory();
    if (!story) return;

    const box = document.getElementById('wpPreviewBox');
    if (story.wallpaper) {
        box.style.backgroundImage = `url('${story.wallpaper}')`;
        box.textContent = '';
    } else {
        box.style.backgroundImage = '';
        box.textContent = 'No Wallpaper';
    }

    modalWallpaper.classList.add('show');
});

document.getElementById('btnSelectWpSrc').addEventListener('click', () => {
    imageTargetContext = { type: 'wallpaper' };
    showImageSourceSelector();
});

document.getElementById('btnSaveWallpaper').addEventListener('click', () => {
    modalWallpaper.classList.remove('show');
    saveToStorage();
    renderChat();
});

document.getElementById('btnCloseWallpaper').addEventListener('click', () => {
    modalWallpaper.classList.remove('show');
});

document.getElementById('btnImgSrcLink').addEventListener('click', () => {
    modalImageSource.classList.remove('show');
    if (!imageTargetContext) return;

    if (imageTargetContext.type === 'profile_avatar') {
        const story = getCurrentStory();
        showCustomPrompt("Profile Picture URL", story ? story.avatarImg : "", (url) => {
            if (!url.trim()) return;
            if (story) story.avatarImg = url.trim();
            const prev = document.getElementById('profileAvatarPreview');
            if (prev) {
                prev.style.backgroundImage = `url('${url.trim()}')`;
                prev.textContent = '';
            }
            imageTargetContext = null;
        });
    } else if (imageTargetContext.type === 'wallpaper') {
        const story = getCurrentStory();
        showCustomPrompt("Chat Wallpaper URL", story ? story.wallpaper : "", (url) => {
            if (!url.trim()) return;
            if (story) story.wallpaper = url.trim();
            const box = document.getElementById('wpPreviewBox');
            if (box) {
                box.style.backgroundImage = `url('${url.trim()}')`;
                box.textContent = '';
            }
            imageTargetContext = null;
        });
    } else if (imageTargetContext.type === 'chat_msg') {
        const side = imageTargetContext.side;
        showCustomPrompt("Direct Image URL", "", (url) => {
            if (!url.trim()) return;
            addMessageToCurrentNode('image', side, url.trim());
            imageTargetContext = null;
        });
    } else if (imageTargetContext.type === 'edit_msg') {
        const msg = imageTargetContext.msgRef;
        showCustomPrompt("New Image URL", msg ? msg.text : "", (url) => {
            if (!url.trim()) return;
            if (msg) {
                msg.text = url.trim();
                updateNodeMessageRef(msg, url.trim());
                saveToStorage();
                renderChat();
            }
            imageTargetContext = null;
        });
    }
});

document.getElementById('btnImgSrcGallery').addEventListener('click', () => {
    modalImageSource.classList.remove('show');
    document.getElementById('fileImageInput').click();
});

document.getElementById('btnImgSrcCancel').addEventListener('click', () => {
    modalImageSource.classList.remove('show');
    imageTargetContext = null;
});

document.getElementById('fileImageInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const base64 = evt.target.result;
        if (imageTargetContext) {
            if (imageTargetContext.type === 'profile_avatar') {
                const story = getCurrentStory();
                if (story) {
                    story.avatarImg = base64;
                    const prev = document.getElementById('profileAvatarPreview');
                    if (prev) {
                        prev.style.backgroundImage = `url('${base64}')`;
                        prev.textContent = '';
                    }
                }
            } else if (imageTargetContext.type === 'wallpaper') {
                const story = getCurrentStory();
                if (story) {
                    story.wallpaper = base64;
                    const box = document.getElementById('wpPreviewBox');
                    if (box) {
                        box.style.backgroundImage = `url('${base64}')`;
                        box.textContent = '';
                    }
                }
            } else if (imageTargetContext.type === 'chat_msg') {
                addMessageToCurrentNode('image', imageTargetContext.side, base64);
            } else if (imageTargetContext.type === 'edit_msg') {
                const msg = imageTargetContext.msgRef;
                if (msg) {
                    msg.text = base64;
                    updateNodeMessageRef(msg, base64);
                    saveToStorage();
                    renderChat();
                }
            }
            imageTargetContext = null;
        }
        e.target.value = '';
    };
    reader.readAsDataURL(file);
});

function openCallSim(type) {
    const story = getCurrentStory();
    if (!story) return;

    const perm = story.permission || 'full';
    if (isEditMode && (!story.isLocked || perm === 'full')) {
        showCustomPrompt("Call Duration (e.g., 03:12)", "02:15", (dur) => {
            addMessageToCurrentNode('call_history', 'center', '', {
                media: type,
                status: 'completed',
                duration: dur || '01:00'
            });
        });
        return;
    }

    const avatarEl = document.getElementById('callSimAvatar');
    if (story.avatarImg) {
        avatarEl.style.backgroundImage = `url('${story.avatarImg}')`;
        avatarEl.textContent = '';
    } else {
        avatarEl.style.backgroundImage = '';
        avatarEl.textContent = story.avatar;
    }

    document.getElementById('callSimName').textContent = story.name;
    document.getElementById('callSimStatus').textContent = type === 'video' ? 'Video Call...' : 'Calling...';
    modalCallSim.classList.add('show');
}

document.getElementById('btnVoiceCall').addEventListener('click', () => openCallSim('voice'));
document.getElementById('btnVideoCall').addEventListener('click', () => openCallSim('video'));
document.getElementById('btnEndCallSim').addEventListener('click', () => modalCallSim.classList.remove('show'));

document.getElementById('btnCloseTree').addEventListener('click', () => modalTree.classList.remove('show'));
document.getElementById('btnAlertOk').addEventListener('click', () => modalCustomAlert.classList.remove('show'));

document.getElementById('btnConfirmYes').addEventListener('click', () => {
    modalCustomConfirm.classList.remove('show');
    if (onConfirmCallback) onConfirmCallback();
});
document.getElementById('btnConfirmNo').addEventListener('click', () => {
    modalCustomConfirm.classList.remove('show');
    if (onCancelCallback) onCancelCallback();
});

document.getElementById('btnPromptSave').addEventListener('click', () => {
    const val = document.getElementById('promptInputText').value;
    modalCustomPrompt.classList.remove('show');
    if (onPromptCallback) onPromptCallback(val);
});
document.getElementById('btnPromptCancel').addEventListener('click', () => modalCustomPrompt.classList.remove('show'));

document.getElementById('btnPickerCancel').addEventListener('click', () => modalOptionPicker.classList.remove('show'));

document.getElementById('btnCloseFullscreen').addEventListener('click', () => modalFullscreenImage.classList.remove('show'));

btnBack.addEventListener('click', () => {
    document.body.classList.remove('show-chat-mode');
});

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('.contact-item');
    let hasResult = false;

    items.forEach(item => {
        const name = item.querySelector('.contact-name').textContent.toLowerCase();
        if (name.includes(query)) {
            item.style.display = 'flex';
            hasResult = true;
        } else {
            item.style.display = 'none';
        }
    });

    emptySearch.style.display = hasResult || items.length === 0 ? 'none' : 'block';
});

loadFromStorage();
renderContacts();
renderChat();