const handleUsersJoin = async (usersID) => {
    addUsersHtml(usersID)

    const allUsers = await msgChannel.getMembers()
    countTotalUsers(allUsers)
}

const addUsersHtml = async (memberID) => {
    const { name } = await msgClient.getUserAttributesByKeys(memberID, ['name'])

    const html = `
        <div class="member__wrapper" id="member__${memberID}__wrapper">
            <span class="green__icon"></span>
            <p class="member_name">${name}</p>
        </div>
    `
    document.getElementById('member__list').insertAdjacentHTML('beforeend', html)

    // add notification users join
    addMsgHtmlNotification(`Welcome to the room ${name}! 👋`)
}

const handleUsersLeave = async (memberID) => {
    removeUsersHtml(memberID)

    const allUsers = await msgChannel.getMembers()
    countTotalUsers(allUsers)
}

const removeUsersHtml = (memberID) => {
    const memberWrapper = document.getElementById(`member__${memberID}__wrapper`)
    const name = memberWrapper.getElementsByClassName('member_name')[0].textContent

    memberWrapper.remove()

    // add notification users leave
    addMsgHtmlNotification(`${name} left room`)
}

const logout = async () => {
    await msgClient.leave()
    await msgChannel.logout()
}

window.addEventListener('beforeunload', logout)


const getAllUsers = async () => {
    const users = await msgChannel.getMembers()
    countTotalUsers(users)

    for (let i = 0; i < users.length; i++) {
        const data = users[i];
        addUsersHtml(data)
    }
}

const countTotalUsers = (Users) => {
    document.getElementById('members__count').innerHTML = Users.length
}

const sendMsgChat = async (e) => {
    e.preventDefault()

    const msg = e.target.message.value
    msgChannel.sendMessage({
        text: JSON.stringify({
            type: 'chat',
            message: msg,
            displayName: displayName,
        })
    })
    addMsgHtmlUsers(displayName, msg)

    e.target.reset()
}

document.getElementById('message__form').addEventListener('submit', sendMsgChat)

const getUsersMessage = async (data, memberID) => {
    const msg = JSON.parse(data.text)

    if(msg.type === 'chat'){
        addMsgHtmlUsers(msg.displayName, msg.message)
    }

    if (msg.type === 'user_left') {
        document.getElementById(`user-contain-${uid}`).remove()

        if(userIdInDisplayFrame === `user-contain-${uid}`){
            displayFrame.style.display = null

            const videoFrames = document.getElementsByClassName('video__container')
            for(let i = 0; videoFrames.length > i; i++){
                videoFrames[i].style.height = '300px'
                videoFrames[i].style.width = '300px'
            }
        }
    }
}

const addMsgHtmlUsers = (name, msg) => {
    const html = `
        <div class="message__wrapper">
            <div class="message__body">
                <strong class="message__author">${name}</strong>
                <p class="message__text">${msg}</p>
            </div>
        </div>
    `
    document.getElementById('messages').insertAdjacentHTML('beforeend', html)
    scrollToBottom()
}

const addMsgHtmlNotification = (msg) => {
    const html = `
        <div class="message__wrapper">
            <div class="message__body">
                <strong class="message__author">🤖 Mumble Bot</strong>
                <p class="message__text">${msg}</p>
            </div>
        </div>
    `
    document.getElementById('messages').insertAdjacentHTML('beforeend', html)
    scrollToBottom()
}

const scrollToBottom = () => {
    const html = document.querySelector('#messages .message__wrapper:last-child')
    if(html){
        html.scrollIntoView()
    }
}