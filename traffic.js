/*******************************************************
 * MỘC TRÀ - TRAFFIC TRACKING
 *
 * Chức năng:
 * - Tạo visitor_id
 * - Tạo session_id
 * - Ghi visit
 * - Heartbeat mỗi 15 giây
 * - Theo dõi UTM
 * - Theo dõi page / referrer
 *
 * API:
 * MỘC TRÀ Traffic API
 *******************************************************/

(function () {

  "use strict";


  /* =====================================================
     CONFIG
  ===================================================== */

  const TRAFFIC_API_URL =
    "https://script.google.com/macros/s/AKfycby71Hw8BqFTl0mdiJWWfkNr6Ic1Q5WcXNwarfwdyLtVRV6ZSMgBvTufhn8H63LYJ1_2/exec";


  const HEARTBEAT_INTERVAL =
    15000;


  /* =====================================================
     STORAGE KEY
  ===================================================== */

  const VISITOR_KEY =
    "moc_tra_visitor_id";

  const SESSION_KEY =
    "moc_tra_session_id";


  /* =====================================================
     CREATE RANDOM ID
  ===================================================== */

  function randomId(prefix) {

    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random()
        .toString(36)
        .substring(2, 12)
    );

  }


  /* =====================================================
     GET / CREATE VISITOR ID
  ===================================================== */

  function getVisitorId() {

    try {

      let visitorId =
        localStorage.getItem(
          VISITOR_KEY
        );


      if (!visitorId) {

        visitorId =
          randomId("visitor");


        localStorage.setItem(
          VISITOR_KEY,
          visitorId
        );

      }


      return visitorId;

    } catch (error) {

      /*
       * Nếu trình duyệt chặn localStorage
       * vẫn tạo ID tạm.
       */

      return randomId("visitor");

    }

  }


  /* =====================================================
     GET / CREATE SESSION ID
  ===================================================== */

  function getSessionId() {

    try {

      let sessionId =
        sessionStorage.getItem(
          SESSION_KEY
        );


      if (!sessionId) {

        sessionId =
          randomId("session");


        sessionStorage.setItem(
          SESSION_KEY,
          sessionId
        );

      }


      return sessionId;

    } catch (error) {

      return randomId("session");

    }

  }


  /* =====================================================
     GET UTM
  ===================================================== */

  function getUTM() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    return {

      utm_source:
        params.get("utm_source") || "",

      utm_medium:
        params.get("utm_medium") || "",

      utm_campaign:
        params.get("utm_campaign") || "",

      utm_content:
        params.get("utm_content") || ""

    };

  }


  /* =====================================================
     GET TRAFFIC DATA
  ===================================================== */

  function getTrafficData() {

    const utm =
      getUTM();


    return {

      visitor_id:
        getVisitorId(),

      session_id:
        getSessionId(),

      page:
        window.location.pathname
        || "/",

      page_url:
        window.location.href,

      referrer:
        document.referrer
        || "",

      utm_source:
        utm.utm_source,

      utm_medium:
        utm.utm_medium,

      utm_campaign:
        utm.utm_campaign,

      utm_content:
        utm.utm_content

    };

  }


  /* =====================================================
     ENCODE PARAMETERS
  ===================================================== */

  function encodeParams(data) {

    const params =
      new URLSearchParams();


    Object.keys(data)
      .forEach(function (key) {

        params.set(
          key,
          data[key] == null
            ? ""
            : String(data[key])
        );

      });


    return params.toString();

  }


  /* =====================================================
     JSONP REQUEST
  ===================================================== */

  function jsonpRequest(
    action,
    data
  ) {

    return new Promise(
      function (resolve) {

        const callbackName =
          "mocTraTraffic_" +
          Date.now() +
          "_" +
          Math.random()
            .toString(36)
            .substring(2, 8);


        const script =
          document.createElement(
            "script"
          );


        const params =
          Object.assign(
            {},
            data,
            {
              action:
                action,

              callback:
                callbackName
            }
          );


        window[callbackName] =
          function (response) {

            try {

              resolve(
                response
              );

            } finally {

              cleanup();

            }

          };


        function cleanup() {

          try {

            delete window[
              callbackName
            ];

          } catch (error) {

            window[
              callbackName
            ] = undefined;

          }


          if (
            script.parentNode
          ) {

            script.parentNode
              .removeChild(script);

          }

        }


        /*
         * Nếu API không phản hồi
         * sau 10 giây thì bỏ request.
         */

        const timeout =
          setTimeout(
            function () {

              cleanup();

              resolve({
                success: false,
                error:
                  "Traffic API timeout."
              });

            },
            10000
          );


        /*
         * Khi response thành công
         * clear timeout.
         */

        const originalCallback =
          window[callbackName];


        window[callbackName] =
          function (response) {

            clearTimeout(
              timeout
            );

            try {

              resolve(
                response
              );

            } finally {

              cleanup();

            }

          };


        script.async = true;


        script.src =
          TRAFFIC_API_URL +
          "?" +
          encodeParams(params);


        script.onerror =
          function () {

            clearTimeout(
              timeout
            );

            cleanup();

            resolve({
              success: false,
              error:
                "Cannot connect to Traffic API."
            });

          };


        document.head.appendChild(
          script
        );

      }
    );

  }


  /* =====================================================
     SEND VISIT
  ===================================================== */

  function sendVisit() {

    const data =
      getTrafficData();


    console.log(
      "[MOC TRA TRAFFIC] Sending visit:",
      data
    );


    jsonpRequest(
      "visit",
      data
    )
      .then(
        function (response) {

          console.log(
            "[MOC TRA TRAFFIC] Visit response:",
            response
          );

        }
      )
      .catch(
        function (error) {

          console.error(
            "[MOC TRA TRAFFIC] Visit error:",
            error
          );

        }
      );

  }


  /* =====================================================
     SEND HEARTBEAT
  ===================================================== */

  function sendHeartbeat() {

    const data =
      getTrafficData();


    console.log(
      "[MOC TRA TRAFFIC] Heartbeat"
    );


    jsonpRequest(
      "heartbeat",
      data
    )
      .then(
        function (response) {

          console.log(
            "[MOC TRA TRAFFIC] Heartbeat response:",
            response
          );

        }
      )
      .catch(
        function (error) {

          console.error(
            "[MOC TRA TRAFFIC] Heartbeat error:",
            error
          );

        }
      );

  }


  /* =====================================================
     PAGE VISIBILITY
  ===================================================== */

  function setupVisibility() {

    document.addEventListener(
      "visibilitychange",
      function () {

        if (
          document.visibilityState ===
          "visible"
        ) {

          sendHeartbeat();

        }

      }
    );

  }


  /* =====================================================
     INIT
  ===================================================== */

  function initTraffic() {

    console.log(
      "[MOC TRA TRAFFIC] Initializing..."
    );


    console.log(
      "[MOC TRA TRAFFIC] Visitor:",
      getVisitorId()
    );


    console.log(
      "[MOC TRA TRAFFIC] Session:",
      getSessionId()
    );


    /*
     * Gửi visit ngay khi page load
     */

    sendVisit();


    /*
     * Heartbeat mỗi 15 giây
     */

    setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL
    );


    /*
     * Khi quay lại tab
     */

    setupVisibility();

  }


  /* =====================================================
     START
  ===================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initTraffic
    );

  } else {

    initTraffic();

  }


  /* =====================================================
     DEBUG API
  ===================================================== */

  window.MocTraTraffic = {

    getVisitorId:
      getVisitorId,

    getSessionId:
      getSessionId,

    getTrafficData:
      getTrafficData,

    sendVisit:
      sendVisit,

    sendHeartbeat:
      sendHeartbeat

  };


})();
