const APP_ID = "f74fbc59e5fc46099b71d33b5b54e200"

function ConvertStringToHex(str) {
    var arr = [];
    for (var i = 0; i < str.length; i++) {
           arr[i] = ("00" + str.charCodeAt(i).toString(16)).slice(-4);
    }
    return arr.join("");
}

let uid = sessionStorage.getItem("uid")
if(!uid) {
    uid = String(Math.floor(Math.random() * 10000))
    sessionStorage.setItem("uid", uid)
}

// console.log(uid)

let token = null
let client

let msgClient
let msgChannel

const queryTab = window.location.search
const queryUrl = new URLSearchParams(queryTab)
let roomID = queryUrl.get('room')

if (!roomID) {
    roomID = "main"
}

const displayName = sessionStorage.getItem('display_name')
if(!displayName){
    window.location = 'index.html'
}

let localTrack = []
let remoteUsers = {}
let localScreenTracks
let sharingScreen = false

const joinRoom = async () => {
    msgClient = await AgoraRTM.createInstance(APP_ID)
    await msgClient.login({ uid, token })

    await msgClient.addOrUpdateLocalUserAttributes({ 'name': displayName })

    msgChannel = await msgClient.createChannel(roomID)
    await msgChannel.join()

    msgChannel.on('MemberJoined', handleUsersJoin)
    msgChannel.on('MemberLeft', handleUsersLeave)
    msgChannel.on('ChannelMessage', getUsersMessage)

    // call all users join
    getAllUsers()
    // add notification welcome users
    addMsgHtmlNotification(`Welcome to the room ${roomID}! 👋`)

    client = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8'
    })
    await client.join(APP_ID, roomID, token, uid)

    client.on('user-published', handleUserPublish)
    client.on('user-left', handleUserLeaveRoom)

    // joinStream()
}

const joinStream = async () => {
    // before click button join room
    document.getElementById('joinBtn').style.display = 'none'
    document.getElementsByClassName('stream__actions')[0].style.display = 'flex'
    
    localTrack = await AgoraRTC.createMicrophoneAndCameraTracks(
        {},
        {
            encoderConfig: {
                width: {
                    min: 640,
                    ideal: 1920,
                    max: 1920,
                },
                height: {
                    min: 640,
                    ideal: 1920,
                    max: 1920,
                },
            }
        }
    )

    const playVideo = `
        <div class="video__container" id="user-contain-${uid}">
            <div class="video-player" id="user-${uid}">

            </div>
        </div>
    `
    document.getElementById('streams__container').insertAdjacentHTML('beforeend', playVideo)
    document.getElementById(`user-contain-${uid}`).addEventListener("click", expandVideoFrame)

    localTrack[1].play(`user-${uid}`)

    // console.log('test')
    await client.publish([localTrack[0], localTrack[1]])
}
document.getElementById('joinBtn').addEventListener('click', joinStream)


const handleUserPublish = async (user, mediaType) => {
    // console.log(user, mediaType, 'coba publish')    
    remoteUsers[user.uid] = user

    await client.subscribe(user, mediaType)

    const playUser = document.getElementById(`user-${user.uid}`)
    if (playUser === null) {
        const playVideo = `
            <div class="video__container" id="user-contain-${user.uid}">
                <div class="video-player" id="user-${user.uid}">

                </div>
            </div>
        `
        document.getElementById('streams__container').insertAdjacentHTML('beforeend', playVideo)
        document.getElementById(`user-contain-${user.uid}`).addEventListener("click", expandVideoFrame)
    }

    // add styles is users extend display
    if(displayFrame.style.display){
        const videoFrame = document.getElementById(`user-contain-${user.uid}`)
        videoFrame.style.height = '100px'
        videoFrame.style.width = '100px'
    }

    if (mediaType === "video") {
        user.videoTrack.play(`user-${user.uid}`)
    }

    if (mediaType === "audio") {
        user.audioTrack.play()
    }
}

const handleUserLeaveRoom = async (user) => {
    // remove users from array
    delete remoteUsers[user.uid]

    const item = document.getElementById(`user-contain-${user.uid}`)
    if (item) {
        item.remove()
    }

    // revert styles back before user extend display
    if(userIdInDisplayFrame === `user-contain-${user.uid}`){
        displayFrame.style.display = null
        
        const videoFrames = document.getElementsByClassName('video__container')
        for(let i = 0; videoFrames.length > i; i++){
            videoFrames[i].style.height = '300px'
            videoFrames[i].style.width = '300px'
        }
    }
}

const handleCamera = async (e) => {
    const btn = e.currentTarget
    console.log(btn)
    if (localTrack[1].muted) {
        await localTrack[1].setMuted(false)
        btn.classList.add('active')
        return
    }

    await localTrack[1].setMuted(true)
    btn.classList.remove('active')
    return
}
document.getElementById('cameraBtn').addEventListener('click', handleCamera)

const handleMic = async (e) => {
    const btn = e.currentTarget
    if (localTrack[0].muted) {
        await localTrack[0].setMuted(false)
        btn.classList.add('active')
        return
    }

    await localTrack[0].setMuted(true)
    btn.classList.remove('active')
    return
}
document.getElementById('micBtn').addEventListener('click', handleMic)

const handlePresentScreen = async (e) => {
    const screenButton = e.currentTarget
    const cameraButton = document.getElementById('cameraBtn')

    if(!sharingScreen){
        sharingScreen = true

        screenButton.classList.add('active')
        cameraButton.classList.remove('active')
        cameraButton.style.display = 'none'

        localScreenTracks = await AgoraRTC.createScreenVideoTrack()

        document.getElementById(`user-contain-${uid}`).remove()
        displayFrame.style.display = 'block'

        const play = `
            <div class="video__container" id="user-contain-${uid}">
                <div class="video-player" id="user-${uid}"></div>
            </div>
        `

        displayFrame.insertAdjacentHTML('beforeend', play)
        document.getElementById(`user-contain-${uid}`).addEventListener('click', expandVideoFrame)

        userIdInDisplayFrame = `user-contain-${uid}`
        localScreenTracks.play(`user-${uid}`)

        await client.unpublish([localTrack[1]])
        await client.publish([localScreenTracks])

        const video = document.getElementsByClassName('video__container')
        for(let i = 0; video.length > i; i++){
            if(video[i].id != userIdInDisplayFrame){
              video[i].style.height = '100px'
              video[i].style.width = '100px'
            }
          }


    }else{
        sharingScreen = false 
        cameraButton.style.display = 'block'
        document.getElementById(`user-contain-${uid}`).remove()
        await client.unpublish([localScreenTracks])

        switchToCamera()
    }
}

document.getElementById('screenBtn').addEventListener('click', handlePresentScreen)

const switchToCamera = async () => {
    let player = `
        <div class="video__container" id="user-contain-${uid}">
            <div class="video-player" id="user-${uid}"></div>
        </div>
    `
    displayFrame.insertAdjacentHTML('beforeend', player)

    await localTrack[0].setMuted(true)
    await localTrack[1].setMuted(true)

    document.getElementById('micBtn').classList.remove('active')
    document.getElementById('screenBtn').classList.remove('active')

    localTrack[1].play(`user-${uid}`)
    await client.publish([localTrack[1]])
}


const handleLeaveRoom = async (e) => {
    e.preventDefault()

    document.getElementById('joinBtn').style.display = 'block'
    document.getElementsByClassName('stream__actions')[0].style.display = 'none'

    for(let i = 0; localTrack.length > i; i++){
        localTrack[i].stop()
        localTrack[i].close()
    }

    await client.unpublish([localTrack[0], localTrack[1]])

    if(localScreenTracks){
        await client.unpublish([localScreenTracks])
    }

    document.getElementById(`user-contain-${uid}`).remove()

    if(userIdInDisplayFrame === `user-contain-${uid}`){
        displayFrame.style.display = null

        const videoFrames = document.getElementsByClassName('video__container')
        for(let i = 0; videoFrames.length > i; i++){
            videoFrames[i].style.height = '300px'
            videoFrames[i].style.width = '300px'
        }
    }

    msgChannel.sendMessage({
        text: JSON.stringify({
            type: 'user_left',
            uid: uid
        })
    })
}

document.getElementById('leaveBtn').addEventListener('click', handleLeaveRoom)

joinRoom()