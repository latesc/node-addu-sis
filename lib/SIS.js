
const { fetch: _fetch, CookieJar } = require('./utils/fetch-cookies');
const { jsdom } = require('jsdom-jscore-rn')
const qs = require('querystring')

const User = require('./models/User')
const Grades = require('./models/Grades')
const Balance = require('./models/Balance')
const Registration = require('./models/Registration')
const Curriculum = require('./models/Curriculum')
const SearchResult = require('./models/SearchResult')
/*
const PreregList = require('./models/PreregList')
const PreregSearchResult = require('./models/PreregSearchResult')
*/

class SIS {

  #url
  #username
  #password

  constructor(username, password, options) {
    options = options || {}
    if ('url' in options) {
      if (typeof options.url === Array) {
        this.#url = options.url[Math.floor(Math.random() * Math.floor(url.length))]
      } else {
        this.#url = options.url
      }
    } else {
      this.#url = 'https://sis.addu.edu.ph'
    }
    this.#username = username
    this.#password = password
  }

  async _request(url) {
    if (url === null) throw new Error('URL is required.') 

    try {
      const data = {
        name: this.#username,
        pass: this.#password,
        form_id: 'user_login_block',
        op: 'Log in'
      }
      const cookieJar = new CookieJar()

      var x = await _fetch(cookieJar, `${this.#url}?destination=${url}`, { 
        method: 'POST',
        body: qs.stringify(data),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      var body = await x.text()
      return { response: body, cookieJar }
    } catch (err) {
      if (typeof err === 'object') {
        if ('response' in err) {
          if (err.response.status === 403) {
            throw new Error('Invalid Username and Password! Please login again.')
          } else if (err.response.status === 408 || err.code === 'ECONNABORTED' || err.response.status === 500) {
            throw new Error('AdDU SIS Server Timeout.')
          }
        }
      }
      return null
    }
  }

  async checkAuth() {
    var home = (await this._request(`/node`)).response
    var dom = new jsdom(home)
    if (dom.querySelector("#block-system-navigation > div > ul > li:nth-child(2) > a").textContent === 'My Grades') {
      return true
    } else {
      return false
    }
  }

  async getGrades() {
    var allGrades = []
    const prevPage = async (sem, year, cookieJar) => {
      try {
        var page = await _fetch(cookieJar, `${this.#url}/grades/${sem}/${year}`, { 
          method: 'GET'
        })
        if (page) {
          var body = await page.text()
          allGrades.push(body)
          var dom = new jsdom(body)
          var _sem = dom.querySelector("#view-grade-form > div > stron > input[type=hidden]:nth-child(7)").value
          var _year = dom.querySelector("#view-grade-form > div > stron > input[type=hidden]:nth-child(8)").value

          if (_sem && _year) {
            await prevPage(_sem, _year, cookieJar)
          }
        }
      } catch (err) {
        return null
      }
    }

    var latestPage = await this._request(`grades`)
    var latest = latestPage.response
    if (latest) {
      allGrades.push(latest)

      var dom = new jsdom(latest)
      var _sem = dom.querySelector("#view-grade-form > div > stron > input[type=hidden]:nth-child(7)")
      var _year = dom.querySelector("#view-grade-form > div > stron > input[type=hidden]:nth-child(8)")

      if (_sem !== null && _year !== null) {
        await prevPage(_sem.value, _year.value, latestPage.cookieJar)
      }
    }

    return new Grades(allGrades)
  }

  async getBalance() {
    var allBalance = []
    const prevPage = async (sem, year, period, cookieJar) => {
      try {
        var page = await _fetch(cookieJar, `${this.#url}/balance/${sem}/${year}/${period}`, { 
          method: 'GET'
        })
        if (page) {
          var body = await page.text()
          allBalance.push(body)
          var dom = new jsdom(body)
          var _sem = dom.querySelector("#view-balance-form > div > input[type=hidden]:nth-child(9)").value
          var _year = dom.querySelector("#view-balance-form > div > input[type=hidden]:nth-child(10)").value
          var _period = dom.querySelector("#view-balance-form > div > input[type=hidden]:nth-child(11)").value

          if (_sem && _year && _period) {
            await prevPage(_sem, _year, _period, cookieJar)
          }
        }
      } catch (err) {
        return null
      }
    }

    var latestPage = await this._request(`balance`)
    var latest = latestPage.response
    if (latest) {
      allBalance.push(latest)

      var dom = new jsdom(latest)
      var _sem = dom.querySelector("#view-balance-form > div > input[type=hidden]:nth-child(9)")
      var _year = dom.querySelector("#view-balance-form > div > input[type=hidden]:nth-child(10)")
      var _period = dom.querySelector("#view-balance-form > div > input[type=hidden]:nth-child(11)")

      if (_sem !== null && _year !== null && _period !== null) {
        await prevPage(_sem.value, _year.value, _period.value, latestPage.cookieJar)
      }
    }

    return new Balance(allBalance)
  }

  async getRegistration() {
    var registrationPage = (await this._request(`registration`)).response
    if (registrationPage) {
      var data = registrationPage
    }

    var dom = new jsdom(data)
    if (dom.querySelector('#validate-registration-form')) {
      throw new Error('Validation of registration in SIS is required!')
    }

    return {subjects: new Registration(data), user: new User(data)}
  }

  async getCurriculum() {
    var curriculumPage = (await this._request(`curriculum`)).response
    if (curriculumPage) {
      var data = curriculumPage
    }

    return new Curriculum(data)
  }

  async searchClassOfferings(classCode) {
    if (classCode === null) throw new Error('Class code argument is required.') 

    var page = await this._request(`search_subjects`)
    const dom = new jsdom(page.response)

    const input = {
      classcode: classCode,
      form_id: 'inquiry_form',
      form_token: dom.querySelector("#inquiry-form > div > input[type=hidden]:nth-child(3)").value, 
      op: 'Search'
    }

    try {
      var x = await _fetch(page.cookieJar, `${this.#url}/search_subjects`, { 
        method: 'POST',
        body: qs.stringify(input),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      var body = await x.text()
      return new SearchResult(body)
    } catch (err) {
      return null
    }
  }

  /*
  async getPrereg() {
    var preregPage = (await this._request(`preregistration`)).response
    if (preregPage) {
      var data = preregPage
    }
    const dom = new jsdom(data)
    var preregForm = dom.querySelector("#view-registration-form")

    if (preregForm) {
      return new PreregList(data)
    } else {
      return null // prereg unavailable
    }
  }

  async searchPrereg(classCode) {
    if (classCode === null) throw new Error('Class code argument is required.')

    var page = await this._request(`preregistration`)
    var z = await _fetch(page.cookieJar, `${this.#url}/preregistration/add/search`, { 
      method: 'GET'
    })
    var body = await z.text()
    const dom = new jsdom(body)

    const input = {
      keyword: classCode,
      form_id: 'search_subject_form',
      form_token: dom.querySelector("#search-subject-form > div > input[type=hidden]:nth-child(3)").value, 
      op: 'Search'
    }

    try {
      var x = await _fetch(page.cookieJar, `${this.#url}/preregistration/add/search`, { 
        method: 'POST',
        body: qs.stringify(input),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    } catch (err) {
      return null
    }

    body = await x.text()

    return {
      response: new PreregSearchResult(body),
      session: {
        page: body,
        cookieJar: page.cookieJar
      }
    }
  }

  async addPrereg(classCode, session) {
    if (classCode === null) throw new Error('Class code argument is required.') 
    if (session === null) throw new Error('Session from searchPrereg required.')
    if (typeof session !== 'object') throw new Error('Invalid session object.')
    if (!('page' in session && 'cookieJar' in session)) throw new Error('Invalid session object.')

    var dom = new jsdom(session.page)
    
    var input = {
      subjects: classCode,
      form_id: 'search_subject_result_form',
      form_token: dom.querySelector("#search-subject-result-form > div > input[type=hidden]:nth-child(3)").value, 
      op: 'Add Subject'
    }

    try {
      var x = await _fetch(session.cookieJar, `${this.#url}/preregistration/add/result`, { 
        method: 'POST',
        body: qs.stringify(input),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      var body = await x.text()
      dom = new jsdom(body)

      input = {
        form_id: 'search_subject_confirm_form',
        form_token: dom.querySelector("#search-subject-confirm-form > div > input[type=hidden]:nth-child(3)").value, 
        op: 'Yes'
      }
      var y = await _fetch(session.cookieJar, `${this.#url}/preregistration/add/confirm`, { 
        method: 'POST',
        body: qs.stringify(input),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      body = await y.text()
      dom = new jsdom(body)

      return dom.querySelector("#messages-inner > table > tbody > tr:nth-child(2) > td.body > div.content > div").textContent

    } catch (err) {
      return null
    }
  }

  async dropPrereg(id) {
    if (id === null) throw new Error('Preregistration id argument is required.')
    var page = await this._request(`preregistration`)

    var dom = new jsdom(page.response)

    var input = {
      subjects: id,
      form_id: 'view_registration_form',
      form_token: dom.querySelector("#view-registration-form > div > input[type=hidden]:nth-child(6)").value, 
      op: 'Drop Subject'
    }

    try {
      var x = await _fetch(page.cookieJar, `${this.#url}/preregistration`, { 
        method: 'POST',
        body: qs.stringify(input),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      var body = await x.text()
      dom = new jsdom(body)

      input = {
        form_id: 'drop_subject_confirm_form',
        form_token: dom.querySelector("#drop-subject-confirm-form > div > input[type=hidden]:nth-child(3)").value, 
        op: 'Yes'
      }
      
      var y = await _fetch(page.cookieJar, `${this.#url}/preregistration/drop/confirm`, { 
        method: 'POST',
        body: qs.stringify(input),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      body = await y.text()
      dom = new jsdom(body)

      return dom.querySelector("#messages-inner > table > tbody > tr:nth-child(2) > td.body > div.content > div").textContent

    } catch (err) {
      return null
    }
  }
  */
}

module.exports = SIS