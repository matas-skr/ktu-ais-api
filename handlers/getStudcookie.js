"use strict"

const cheerio         = require('cheerio')
const bodyParser      = require('body-parser')
let request           = require('request')

function getSTUDCOOKIE(username, password) {
  // Create new cookie jar, so autologin wouldn't work (that's good)
  let j = request.jar()
  request = request.defaults({jar: j})
  let opts = {
    method: 'GET',
    url: 'https://uais.cr.ktu.lt/ktuis/studautologin'
  }
  return new Promise((resolve, reject) => {
    // Get cookie of the first login page (just login button)
    request(opts, (err, response, body) => {
      let $ = cheerio.load(body)
      let AuthState = $('input[name="AuthState"]').attr('value')
      let cookie = response.request.headers.cookie
      let options = {
        method: 'POST',
        url: 'https://login.ktu.lt/simplesaml/module.php/core/loginuserpass.php',
        headers: {
          cookie: cookie
        },
        form: {
          username: username,
          password: password,
          AuthState: AuthState
        }
      }
      // Send POST from login form
      request(options, (err, response, body) => {
        let $ = cheerio.load(body)
        let url = $('a#redirlink').attr('href')
        let cookie = response.request.headers.cookie
        let options = {
          url: url,
          method: 'GET',
          headers: {
            cookie: cookie
          }
        }
        // Some redirect
        request(options, (err, response, body) => {
          var $ = cheerio.load(body)
          let StateId = $('input[name="StateId"]').first().attr('value')
          let cookie = response.request.headers.cookie
          let options = {
            url: 'https://login.ktu.lt/simplesaml/module.php/consent/getconsent.php?StateId=' + encodeURIComponent(StateId)+'&',
            method: 'GET',
            headers: {
              cookie: cookie
            },
            qs: {
              StateId: StateId,
              yes: 'Yes, continue',
              saveconsent: 1
            }
          }
          // Click button because js doesnt work when there is no browser
          request(options, (err, response, body) => {
            var $ = cheerio.load(body)
            let SAMLResponse = $('input[name="SAMLResponse"]').attr('value')
            let RelayState = $('input[name="RelayState"]').attr('value')
            let url = 'https://uais.cr.ktu.lt/shibboleth/SAML2/POST'
            let setCookie = response.headers['set-cookie']
            let referer = response.request.headers.referer
            let origin = response.request.headers.origin
            let options = {
              url: url,
              method: 'POST',
              headers: {
                "set-cookie": setCookie,
                referer: referer,
                origin: origin
              },
              form: {
                SAMLResponse: SAMLResponse,
                RelayState: RelayState
              }
            }
            request(options, (err, response, body) => {
              request.get('https://uais.cr.ktu.lt/ktuis/studautologin', (err, res, body) => {
                resolve(res.request.headers.cookie.split(';')[1].trim().split('=')[1])
              })
            })
          })
        })
      })
    })
  })
}

module.exports = getSTUDCOOKIE