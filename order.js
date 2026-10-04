/*************************************************
 * MỘC TRÀ - ORDER.JS
 *
 * Landing page
 *      ↓
 * HTML Form POST
 *      ↓
 * Google Apps Script
 *      ↓
 * Google Sheet
 *      ↓
 * iframe load
 *      ↓
 * SUCCESS
 *
 * Không dùng fetch()
 * Không dùng CORS
 * Không phụ thuộc postMessage
 *************************************************/

const ORDER_API_URL =
  "https://script.google.com/macros/s/AKfycbwGYaRJSAjmxNXQEs2dmpKGJkdd2P7TuP8ateEQvxtWBqONFXx74i5jqjiX1r2e9z33/exec";


/* =================================================
   STATE
================================================= */

const orderState = {
  selected: {
    weight: "1kg",
    price: 350000
  },

  qty: 1,

  submitting: false
};


/* =================================================
   FORMAT MONEY
================================================= */

function formatMoney(value) {
  value = Number(value || 0);

  return value.toLocaleString("vi-VN") + "đ";
}


/* =================================================
   HELPER
================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =================================================
   RENDER ORDER SUMMARY
================================================= */

function renderOrderSummary() {

  const weight =
    orderState.selected.weight;

  const price =
    Number(orderState.selected.price);

  const qty =
    Number(orderState.qty);

  const total =
    price * qty;


  const summaryProduct =
    $("summaryProduct");

  if (summaryProduct) {

    summaryProduct.textContent =
      "Chè Shan Tuyết cổ thụ – " + weight;

  }


  const summaryPrice =
    $("summaryPrice");

  if (summaryPrice) {

    summaryPrice.textContent =
      formatMoney(price);

  }


  const qtyValue =
    $("qtyValue");

  if (qtyValue) {

    qtyValue.textContent =
      qty;

  }


  const summaryTotal =
    $("summaryTotal");

  if (summaryTotal) {

    summaryTotal.textContent =
      formatMoney(total);

  }


  const stickyPrice =
    $("stickyPrice");

  if (stickyPrice) {

    stickyPrice.textContent =
      formatMoney(total);

  }

}


/* =================================================
   PRODUCT OPTIONS
================================================= */

function setupProductOptions() {

  const options =
    document.querySelectorAll(
      "[data-weight][data-price]"
    );


  if (!options.length) {

    console.warn(
      "MỘC TRÀ: Không tìm thấy product options."
    );

    return;

  }


  function selectOption(option) {

    const weight =
      option.dataset.weight;

    const price =
      Number(option.dataset.price);


    orderState.selected = {

      weight: weight,

      price: price

    };


    options.forEach(function(item) {

      item.classList.remove(
        "active",
        "selected"
      );

    });


    option.classList.add("active");


    renderOrderSummary();

  }


  options.forEach(function(option) {

    option.addEventListener(
      "click",
      function() {

        selectOption(option);

      }
    );

  });


  let activeOption =
    Array.from(options).find(
      function(option) {

        return (
          option.classList.contains("active") ||
          option.classList.contains("selected")
        );

      }
    );


  if (!activeOption) {

    activeOption =
      Array.from(options).find(
        function(option) {

          return (
            option.dataset.weight === "1kg"
          );

        }
      );

  }


  if (!activeOption) {

    activeOption =
      options[0];

  }


  selectOption(activeOption);

}


/* =================================================
   QUANTITY
================================================= */

function setupQuantity() {

  const minus =
    $("qtyMinus");

  const plus =
    $("qtyPlus");

  const qtyValue =
    $("qtyValue");


  if (!minus || !plus) {

    return;

  }


  function updateQty() {

    if (qtyValue) {

      qtyValue.textContent =
        orderState.qty;

    }


    renderOrderSummary();

  }


  minus.addEventListener(
    "click",
    function() {

      if (orderState.qty > 1) {

        orderState.qty--;

        updateQty();

      }

    }
  );


  plus.addEventListener(
    "click",
    function() {

      if (orderState.qty < 99) {

        orderState.qty++;

        updateQty();

      }

    }
  );


  updateQty();

}


/* =================================================
   VALIDATE PHONE
================================================= */

function validatePhone(phone) {

  const cleanPhone =
    String(phone || "")
      .replace(/\s+/g, "")
      .replace(/^\+84/, "0");


  return /^(0)(3|5|7|8|9)[0-9]{8}$/
    .test(cleanPhone);

}


/* =================================================
   UTM
================================================= */

function getMarketingData() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  return {

    source:
      params.get("utm_source") || "",

    medium:
      params.get("utm_medium") || "",

    campaign:
      params.get("utm_campaign") || "",

    content:
      params.get("utm_content") || "",

    pageUrl:
      window.location.href

  };

}


/* =================================================
   CREATE HIDDEN IFRAME
================================================= */

function createOrderIframe() {

  let iframe =
    document.getElementById(
      "mocTraOrderIframe"
    );


  if (iframe) {

    return iframe;

  }


  iframe =
    document.createElement("iframe");


  iframe.id =
    "mocTraOrderIframe";


  iframe.name =
    "mocTraOrderIframe";


  iframe.style.position =
    "fixed";

  iframe.style.width =
    "1px";

  iframe.style.height =
    "1px";

  iframe.style.border =
    "0";

  iframe.style.opacity =
    "0";

  iframe.style.pointerEvents =
    "none";

  iframe.style.left =
    "-9999px";

  iframe.style.top =
    "-9999px";


  iframe.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.appendChild(
    iframe
  );


  return iframe;

}


/* =================================================
   LOADING BUTTON
================================================= */

function setSubmitLoading(loading) {

  const button =
    $("submitOrderBtn");


  if (!button) {

    return;

  }


  if (loading) {

    if (!button.dataset.originalText) {

      button.dataset.originalText =
        button.innerHTML;

    }


    button.disabled =
      true;


    button.style.pointerEvents =
      "none";


    button.style.opacity =
      "0.7";


    button.innerHTML =
      "⏳ ĐANG GỬI ĐƠN...";


  } else {

    button.disabled =
      false;


    button.style.pointerEvents =
      "";


    button.style.opacity =
      "";


    if (button.dataset.originalText) {

      button.innerHTML =
        button.dataset.originalText;

    }

  }

}


/* =================================================
   CREATE HIDDEN FORM
================================================= */

function createHiddenForm(data) {

  const iframe =
    createOrderIframe();


  const form =
    document.createElement("form");


  form.method =
    "POST";


  form.action =
    ORDER_API_URL;


  form.target =
    iframe.name;


  form.style.display =
    "none";


  Object.keys(data).forEach(
    function(key) {

      const input =
        document.createElement(
          "input"
        );


      input.type =
        "hidden";


      input.name =
        key;


      input.value =
        data[key] == null
          ? ""
          : String(data[key]);


      form.appendChild(
        input
      );

    }
  );


  document.body.appendChild(
    form
  );


  return {

    form: form,

    iframe: iframe

  };

}


/* =================================================
   SEND ORDER
================================================= */

function sendOrderToGoogleSheet(data) {

  return new Promise(
    function(resolve, reject) {

      let finished =
        false;

      let form =
        null;

      let iframe =
        null;

      let timeout =
        null;


      function cleanup() {

        if (iframe) {

          iframe.onload =
            null;

        }


        if (
          form &&
          form.parentNode
        ) {

          form.parentNode.removeChild(
            form
          );

        }

      }


      function success() {

        if (finished) {

          return;

        }


        finished =
          true;


        if (timeout) {

          clearTimeout(
            timeout
          );

        }


        cleanup();


        console.log(
          "MỘC TRÀ: Google Apps Script đã nhận request."
        );


        resolve({

          success: true,

          orderCode: "",

          message:
            "Đặt hàng thành công."

        });

      }


      function failure(message) {

        if (finished) {

          return;

        }


        finished =
          true;


        if (timeout) {

          clearTimeout(
            timeout
          );

        }


        cleanup();


        reject(
          new Error(
            message ||
            "Không thể gửi đơn hàng."
          )
        );

      }


      try {

        const result =
          createHiddenForm(
            data
          );


        form =
          result.form;

        iframe =
          result.iframe;


        /*
         * QUAN TRỌNG:
         *
         * Khi Google Apps Script xử lý
         * POST xong và trả HTML về iframe,
         * iframe sẽ phát sinh sự kiện load.
         *
         * Không cần postMessage nữa.
         */

        iframe.onload =
          function() {

            console.log(
              "MỘC TRÀ: iframe đã nhận response."
            );


            /*
             * Chờ một chút để đảm bảo
             * request phía Google đã hoàn tất.
             */

            setTimeout(
              function() {

                success();

              },
              500
            );

          };


        console.log(
          "MỘC TRÀ - SUBMIT ORDER:",
          data
        );


        /*
         * Timeout 20 giây
         */

        timeout =
          setTimeout(
            function() {

              failure(
                "Máy chủ phản hồi quá lâu. Vui lòng kiểm tra lại Google Sheet."
              );

            },
            20000
          );


        /*
         * GỬI FORM
         */

        form.submit();


      } catch (error) {

        failure(
          error &&
          error.message
            ? error.message
            : "Không thể gửi đơn hàng."
        );

      }

    }
  );

}


/* =================================================
   SHOW SUCCESS
================================================= */

function showOrderSuccess(result) {

  console.log(
    "MỘC TRÀ - ORDER SUCCESS:",
    result
  );


  /*
   * Nếu source HTML có UI success riêng
   */

  if (
    typeof window.showOrderSuccessUI ===
    "function"
  ) {

    window.showOrderSuccessUI(
      result
    );

    return;

  }


  const success =
    $("success");


  if (!success) {

    alert(
      "Đặt hàng thành công!"
    );

    return;

  }


  success.style.display =
    "block";


  /*
   * Mã đơn
   */

  const orderCodeElements =
    success.querySelectorAll(
      "[data-order-code]"
    );


  orderCodeElements.forEach(
    function(el) {

      el.textContent =
        result.orderCode || "";

    }
  );


  /*
   * Message
   */

  const messageElements =
    success.querySelectorAll(
      "[data-order-message]"
    );


  messageElements.forEach(
    function(el) {

      el.textContent =
        result.message ||
        "Đặt hàng thành công.";

    }
  );


  /*
   * Scroll
   */

  try {

    success.scrollIntoView({

      behavior: "smooth",

      block: "start"

    });

  } catch (error) {

    success.scrollIntoView();

  }

}


/* =================================================
   RESET
================================================= */

function resetOrder() {

  const form =
    $("orderForm");


  if (form) {

    form.reset();

  }


  orderState.qty =
    1;


  renderOrderSummary();

}


/* =================================================
   SETUP ORDER FORM
================================================= */

function setupOrderForm() {

  const form =
    $("orderForm");


  if (!form) {

    console.warn(
      "MỘC TRÀ: Không tìm thấy #orderForm"
    );

    return;

  }


  form.addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();


      if (
        orderState.submitting
      ) {

        return;

      }


      const nameInput =
        $("name");

      const phoneInput =
        $("phone");

      const addressInput =
        $("address");


      const name =
        nameInput
          ? nameInput.value.trim()
          : "";


      const phone =
        phoneInput
          ? phoneInput.value.trim()
          : "";


      const address =
        addressInput
          ? addressInput.value.trim()
          : "";


      /*
       * NAME
       */

      if (!name) {

        alert(
          "Vui lòng nhập họ tên."
        );


        if (nameInput) {

          nameInput.focus();

        }


        return;

      }


      /*
       * PHONE
       */

      if (!phone) {

        alert(
          "Vui lòng nhập số điện thoại."
        );


        if (phoneInput) {

          phoneInput.focus();

        }


        return;

      }


      if (!validatePhone(phone)) {

        alert(
          "Số điện thoại không hợp lệ. Vui lòng kiểm tra lại."
        );


        if (phoneInput) {

          phoneInput.focus();

        }


        return;

      }


      /*
       * ADDRESS
       */

      if (!address) {

        alert(
          "Vui lòng nhập địa chỉ nhận hàng."
        );


        if (addressInput) {

          addressInput.focus();

        }


        return;

      }


      /*
       * PRODUCT
       */

      const weight =
        orderState.selected.weight;


      const quantity =
        Number(
          orderState.qty
        );


      const unitPrice =
        Number(
          orderState.selected.price
        );


      const total =
        unitPrice *
        quantity;


      /*
       * UTM
       */

      const marketing =
        getMarketingData();


      /*
       * ORDER DATA
       */

      const order = {

        name:
          name,

        phone:
          phone,

        address:
          address,

        product:
          "Chè Shan Tuyết cổ thụ",

        weight:
          weight,

        quantity:
          quantity,

        unitPrice:
          unitPrice,

        total:
          total,

        source:
          marketing.source,

        medium:
          marketing.medium,

        campaign:
          marketing.campaign,

        content:
          marketing.content,

        pageUrl:
          marketing.pageUrl

      };


      console.log(
        "MỘC TRÀ - ORDER DATA:",
        order
      );


      /*
       * START LOADING
       */

      orderState.submitting =
        true;


      setSubmitLoading(
        true
      );


      try {

        const result =
          await sendOrderToGoogleSheet(
            order
          );


        console.log(
          "MỘC TRÀ - SUCCESS:",
          result
        );


        /*
         * HIỆN THÀNH CÔNG
         */

        showOrderSuccess(
          result
        );


        /*
         * RESET
         */

        resetOrder();


      } catch (error) {

        console.error(
          "MỘC TRÀ - ORDER ERROR:",
          error
        );


        alert(
          error &&
          error.message
            ? error.message
            : "Không thể gửi đơn hàng. Vui lòng thử lại."
        );


      } finally {

        orderState.submitting =
          false;


        setSubmitLoading(
          false
        );

      }

    }
  );

}


/* =================================================
   INIT
================================================= */

function initMocTraOrder() {

  try {

    setupProductOptions();

    setupQuantity();

    setupOrderForm();

    renderOrderSummary();


    console.log(
      "MỘC TRÀ - Order system ready."
    );


  } catch (error) {

    console.error(
      "MỘC TRÀ - INIT ERROR:",
      error
    );

  }

}


/* =================================================
   PUBLIC API
================================================= */

window.MocTraOrder = {

  formatMoney:
    formatMoney,

  renderOrderSummary:
    renderOrderSummary,

  resetOrder:
    resetOrder,

  sendOrder:
    sendOrderToGoogleSheet

};


/* =================================================
   START
================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initMocTraOrder
  );

} else {

  initMocTraOrder();

}