console.log("sw.js")

importScripts(
  'pusher.worker.min.js',
  'localforage.min.js'
)

const CACHE_NAME = 'v2'


/*
  Cache + Serve the frontend
*/

self.addEventListener('install', (event) => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        cache.addAll([
          '/json',
          '/',
          '/ractive.min.js'
        ])
      )
  )

})


self.addEventListener('fetch', (event) => {
  // cache first then network
  event.respondWith(
    caches
      .match(event.request)
      .then(match =>
        match || fetch(event.request)
      )
  )
})




/*
  Update /json with messages data from Pusher
*/


config()
  .then( config => {

    var pusher = new Pusher(config.key, {
      cluster: config.cluster,
      encrypted: true
    })

    pusher
      .subscribe(config.channel)
      .bind('tweet', add)

    // recache '/json' on reconnect (might have changed)
    pusher
      .connection
        .bind('connected', c =>
          caches.open(CACHE_NAME)
            .then(cache =>
              cache.addAll([
                '/json'
              ])
            )
        )
  })




const add = (tweet) => {
  console.log(`🚀 ${tweet.text}`)

  // patch the cached version of the json file, adding the new content
  caches.match('/json')
    .then(resp => resp.json())
    .then(tweets => {

      if(!tweets.some(
        t => t.id_str == tweet.id_str
      )) {
        tweets.unshift(tweet)
        broadcast(tweet)
      }

      while(tweets.length <= 50) tweets.pop()

      cacheImages(tweets)

      caches.open(CACHE_NAME)
        .then(cache =>
          cache.put('/json', new Response(
            JSON.stringify(tweets),
            {headers: {'Content-Type': 'application/json'}}
          ))
        )

    })
}

// post a message to all clients
const broadcast = (message) =>
  self.clients.matchAll()
    .then((clients) =>
      clients.forEach((client) =>
        client.postMessage(message)
      )
    )



const cacheImages = (tweets) =>
  caches.open(CACHE_NAME)
    .then((cache) =>  {
      tweets.forEach(t => {
        cache.match(t.img)
          .then(img => {
            if(!img) {
              fetch(t.img, {
                mode: 'no-cors'
              })
              .then(
                r => cache.put(t.img, r)
              )
              .catch(e =>
                console.log('error caching image', e)
              )
            }
          })
      })
    })


function config() {

  // fire an update regardless, doesn't matter too much if it fails
  const update = fetch('/config')
    .then(r => r.json())
    .then(config => {
      if(config) localforage.setItem('config', config)
    })

  return localforage.getItem('config')
    .then( config => config || update )
}


// development helper

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
