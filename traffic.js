/*************************************************
 * MỘC TRÀ - TRAFFIC TRACKER
 * Landing Page → Traffic API
 *************************************************/

const TRAFFIC_API_URL =
  "https://script.google.com/macros/s/AKfycby71Hw8BqFTl0mdiJWWfkNr6Ic1Q5WcXNwarfwdyLtVRV6ZSMgBvTufhn8H63LYJ1_2/exec";


/* =================================================
   CONFIG
================================================= */

const TRAFFIC_CONFIG = {

  heartbeatInterval:
    15000,

  onlineTimeout:
    60000

};


/* =================================================
   ID GENERATOR
================================================= */

function generateTrafficId(prefix) {

  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 10)
  );

}


/* =================================================
   VISITOR ID
================================================= */

function getVisitorId() {

  const key =
    "moc_tra_visitor_id";


  try {

    let visitorId =
      localStorage.getItem(key);


    if (!visitorId) {

      visitorId =
        generateTrafficId(
          "visitor"
        );


      localStorage.setItem(
        key,
        visitorId
      );

    }


    return visitorId;

  }

  catch (error) {

    /*
     * Nếu trình duyệt chặn localStorage
     */

    return generateTrafficId(
      "visitor"
    );

  }

}


/* =================================================
   SESSION ID
================================================= */

function getSessionId() {

  const key =
    "moc_tra_session_id";


  try {

    let sessionId =
      sessionStorage.getItem(key);


    if (!sessionId) {

      sessionId =
        generateTrafficId(
          "session"
        );


      sessionStorage.setItem(
        key,
        sessionId
      );

    }


    return sessionId;

  }

  catch (error) {

    return generateTrafficId(
      "session"
    );

  }

}


/* =================================================
   URL PARAMS / UTM
================================================= */

function getTrafficMarketingData() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  return {

    utm_source:
      params.get(
        "utm_source"
      ) || "",

    utm_medium:
      params.get(
        "utm_medium"
      ) || "",

    utm_campaign:
      params.get(
        "utm_campaign"
      ) || "",

    utm_content:
      params.get(
        "utm_content"
      ) || ""

  };

}


/* =================================================
   SEND REQUEST
   Dùng IMAGE BEACON
   Không cần CORS
================================================= */

function sendTrafficRequest(
  action
) {

  const marketing =
    getTrafficMarketingData();


  const visitorId =
    getVisitorId();


  const sessionId =
    getSessionId();


  const params =
    new URLSearchParams();


  params.set(
    "action",
    action
  );


  params.set(
    "visitor_id",
    visitorId
  );


  params.set(
    "session_id",
    sessionId
  );


  params.set(
    "page",
    window.location.pathname
  );


  params.set(
    "page_url",
    window.location.href
  );


  params.set(
    "referrer",
    document.referrer || ""
  );


  params.set(
    "utm_source",
    marketing.utm_source
  );


  params.set(
    "utm_medium",
    marketing.utm_medium
  );


  params.set(
    "utm_campaign",
    marketing.utm_campaign
  );


  params.set(
    "utm_content",
    marketing.utm_content
  );


  /*
   * Image beacon:
   * Không bị CORS như fetch.
   */

  const img =
    new Image();


  img.src =
    TRAFFIC_API_URL +
    "?" +
    params.toString();


  /*
   * Giữ reference một chút
   * để trình duyệt không hủy request.
   */

  setTimeout(
    function() {

      img.onload =
        null;

      img.onerror =
        null;

    },
    10000
  );

}


/* =================================================
   FIRST VISIT
================================================= */

function trackTrafficVisit() {

  sendTrafficRequest(
    "visit"
  );

}


/* =================================================
   HEARTBEAT
================================================= */

function startTrafficHeartbeat() {

  /*
   * Gửi heartbeat định kỳ.
   */

  setInterval(
    function() {

      sendTrafficRequest(
        "heartbeat"
      );

    },
    TRAFFIC_CONFIG
      .heartbeatInterval
  );

}


/* =================================================
   PAGE HIDDEN
================================================= */

function setupVisibilityTracking() {

  document.addEventListener(
    "visibilitychange",
    function() {

      /*
       * Khi người dùng quay lại tab,
       * cập nhật ngay last_seen.
       */

      if (
        document.visibilityState ===
        "visible"
      ) {

        sendTrafficRequest(
          "heartbeat"
        );

      }

    }
  );

}


/* =================================================
   INIT
================================================= */

function initMocTraTraffic() {

  try {

    /*
     * Ghi visit
     */

    trackTrafficVisit();


    /*
     * Bắt đầu heartbeat
     */

    startTrafficHeartbeat();


    /*
     * Theo dõi khi quay lại tab
     */

    setupVisibilityTracking();


  }

  catch (error) {

    console.warn(
      "MỘC TRÀ Traffic:",
      error
    );

  }

}


/* =================================================
   START
================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initMocTraTraffic
  );

}

else {

  initMocTraTraffic();

}


/* =================================================
   PUBLIC API
================================================= */

window.MocTraTraffic = {

  visit:
    trackTrafficVisit,

  heartbeat:
    function() {

      sendTrafficRequest(
        "heartbeat"
      );

  }

};