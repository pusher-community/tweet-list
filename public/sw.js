console.log("sw.js")

importScripts(
  'pusher.worker.min.js',
  'localforage.min.js',
  'mustache.min.js'
)

const CACHE_NAME = 'v2'

const add = (tweet) => {
  console.log(`🚀 ${tweet.text}`)

  // patch the cached version of the json file, adding the new content
  caches.match('/json')
    .then(resp => resp.json())
    .then(tweets => {

      if(!tweets.some(
        t => t.id_str == tweet.id_str
      )) tweets.unshift(tweet)

      while(tweets.length <= 50) tweets.pop()

      caches.open(CACHE_NAME)
        .then(cache =>
          cache.put('/json', new Response(
            JSON.stringify(tweets),
            {headers: {'Content-Type': 'application/json'}}
          ))
        )

    })
}

const populate = () =>
  caches.open(CACHE_NAME)
    .then((cache) =>  cache.addAll(['/json']))

const subscribe = () =>
  fetch('/config')
    .then(res => res.json())
    .then(config => {

      new Pusher(config.key, {
        cluster: config.cluster,
        encrypted: true
      })

      //todo - on reconnect, repopulate
      .subscribe('tweets')
      .bind('tweet', add)

    })


self.addEventListener('install', (event) => {

  // populate cache with current json state, then subscribe for changes
  event.waitUntil(
    Promise.all([populate(),subscribe()])
  )

})

self.addEventListener('fetch', (event) => {

  event.respondWith(
    caches
      .match(event.request)
      .then(match => {
        if(match) return match
        throw "no match"
      })
      .catch(function() {
        return fetch(event.request)
      })
  )

})



self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})



/*
const cacheImages = (tweets) =>
  caches.open(CACHE_NAME)
    .then((cache) =>  {
      tweets.forEach(t => {
        cache.match(t.img)
          .then(img => {
            if(!img) {
              console.log("caching: ", t.img)
              cache.add(t.img)
            }
          })
      })
    })
*/
