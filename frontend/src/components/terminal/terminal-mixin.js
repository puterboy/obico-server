import moment from 'moment'

export default {
  data() {
    return {
      oldTerminalFeed: null,
      terminalFeedArray: [],
      inputValue: '',
      hideTempMessages: true,
      hideSDMessages: true,
    }
  },

  mounted() {
    const hideTempPref = localStorage.getItem(`printer-terminal-filter-prefs-temperature`)
    const hideSDPref = localStorage.getItem(`printer-terminal-filter-prefs-sd`)
    if (hideTempPref) {
      this.hideTempMessages = JSON.parse(hideTempPref)
    }
    if (hideSDPref) {
      this.hideSDMessages = JSON.parse(hideSDPref)
    }
  },

  methods: {
    onNextTerminalFeed(newTerminalFeed) {
      const sameMsg = newTerminalFeed?.msg === this.oldTerminalFeed?.msg
      const same_ts = newTerminalFeed?._ts === this.oldTerminalFeed?._ts
      const newMsg = newTerminalFeed?.msg

      this.oldTerminalFeed = newTerminalFeed
      const tempRegex = /((N\d+\s+)?M105)|((ok\s+([PBN]\d+\s+)*)?([BCLPR]|T\d*):-?\d+)/g
      const SDRegex = /((N\d+\s+)?M27)|(SD printing byte)|(Not SD printing)/g

      if (this.hideSDMessages && SDRegex.test(newMsg)) return
      if (this.hideTempMessages && tempRegex.test(newMsg)) return

      if (!sameMsg && !same_ts) {
        newTerminalFeed.normalTimeStamp = moment().format('h:mm:ssa')
        this.terminalFeedArray.unshift(newTerminalFeed)
      }
    },

    sendMessage() {
      if (!this.inputValue.length) return
      const newString = this.inputValue.toUpperCase()

      if (this.printer.isAgentMoonraker()) {
        this.onNextTerminalFeed({ msg: newString, _ts: new Date() }) // Moonraker doesn't echo the gcodes user enters. Hence we need to insert them to the terminal
      }

      const moonrakerPayload = {
        func: 'printer/gcode/script',
        target: 'moonraker_api',
        kwargs: { script: `${newString}` },
      }
      const octoPayload = {
        func: 'commands',
        target: '_printer',
        args: [`${newString}`],
        force: true,
      }

      const payload = this.printer.isAgentMoonraker() ? moonrakerPayload : octoPayload
      this.printerComm.passThruToPrinter(payload, (err, ret) => {
        if (err) {
          this.$swal.Toast.fire({
            icon: 'error',
            title: err,
          })
        }
      })
      this.inputValue = ''
    },
    clearFeed() {
      this.terminalFeedArray = []
    },
    updateFilterPrefs(str, val) {
      localStorage.setItem(`printer-terminal-filter-prefs-${str}`, JSON.stringify(val))
      if (str === 'temperature') {
        this.hideTempMessages = val
      } else {
        this.hideSDMessages = val
      }
    },
  },
}
