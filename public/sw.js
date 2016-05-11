console.log("swx.jsnew")

importScripts(
  'pusher.worker.min.js',
  'localforage.min.js',
  'mustache.min.js'
)

var tweets = []

const add = (tweet) => {

  if(!tweets.some(_ => _.id_str === tweet.id_str )) {
    tweets.unshift(tweet)
    caches.open('v1').then( (cache) =>
       cache.add(tweet.img)
    )
  }

  // trim down
  while(tweets.length >= 50) {
    var rm = tweets.pop()
    caches.open('v1').then( (cache) =>
      // might be used in other tweets
      cache.delete(rm.img)
    )
  }
}


const fetchAll = () =>
  fetch('/json')
    .then(res => res.json())
    .then(data => tweets = data)

const subscribe = () =>
  fetch('/config')
    .then(res => res.json())
    .then(config =>
      new Pusher(config.key, {
        cluster: config.cluster,
        encrypted: true
      })
      .subscribe('tweets')
      .bind('tweet', add)
    )

var tmpl

const templateSetup = () =>
  fetch('/index.tmpl.html')
    .then(res => res.text())
    .then(text => tmpl = text)

this.addEventListener('install', function(event) {
  event.waitUntil(
    Promise.all([subscribe(), fetchAll(), templateSetup()])
    .then( () => {
      console.log(":INSTALLED:", tmpl, tweets)
    })
  )
})

this.addEventListener('activate', function(event) {
  console.log(":ACTIVATING:", tmpl, tweets)
})


const jsonURL = new URL('/json-sw', self.location)
const htmlURL = new URL('/html-sw', self.location)

this.addEventListener('fetch', function(event) {
  console.log(event.request.url)

  if(event.request.url == jsonURL.href)
    return event.respondWith(
      new Response(JSON.stringify(tweets), {'Content-Type': 'application/json'})
    )

  if(event.request.url == htmlURL.href)
    return event.respondWith(
      new Response(Mustache.render(tmpl, {tweets: tweets}), {
        headers: { 'Content-Type': 'text/html' }
      })
    )

    event.respondWith(
      caches.match(event.request).catch(function() {
        return fetch(event.request);
      })
    )

})
