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

const subscribe = () =>
  fetch('/config')
    .then(res => res.json())
    .then(config => {

      new Pusher(config.key, {
        cluster: config.cluster,
        encrypted: true
      })
      .subscribe('tweets')
      .bind('tweet', add)

    })


this.addEventListener('install', function(event) {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>  cache.addAll(['/json']))
  )

  event.waitUntil(
    subscribe()
  )

})

this.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
  )
})



self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting())
});
self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim())
  console.log("claimed")
});
