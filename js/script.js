"use strict";
(function () {
  // GÜVENLİK YAMASI: jQuery 3.2.1 CVE-2020-11022 / CVE-2020-11023 XSS Koruması
  if (window.jQuery) {
    jQuery.htmlPrefilter = function (html) {
      return html;
    };
  }

  var userAgent = navigator.userAgent.toLowerCase(),
    initialDate = new Date(),
    $document = $(document),
    $window = $(window),
    $html = $("html"),
    $body = $("body"),
    isDesktop = $html.hasClass("desktop"),
    isIE =
      userAgent.indexOf("msie") !== -1
        ? parseInt(userAgent.split("msie")[1], 10)
        : userAgent.indexOf("trident") !== -1
        ? 11
        : userAgent.indexOf("edge") !== -1
        ? 12
        : false,
    windowReady = false,
    isNoviBuilder = false,
    plugins = {
      rdNavbar: $(".rd-navbar"),
      wow: $(".wow"),
      swiper: $(".swiper-slider"),
      isotope: $(".isotope"),
      customToggle: $("[data-custom-toggle]"),
      counter: $(".counter"),
      preloader: $(".preloader"),
      lightGallery: $('[data-lightgallery="group"]'),
      lightGalleryItem: $('[data-lightgallery="item"]'),
      lightDynamicGalleryItem: $('[data-lightgallery="dynamic"]'),
      copyrightYear: $(".copyright-year")
    };

  // Karanlık Mod tercihini sayfa yüklenirken hemen uygula
  try {
    if (localStorage.getItem("sn_theme") === "dark") {
      $html.addClass("dark-mode");
    }
  } catch (e) {}

  // Temaya göre logoyu (logo_siyah.png / logo_beyaz.png) değiştiren ve menü yüksekliğini koruyan fonksiyon
  function updateThemeLogos(isDark) {
    $('img[src*="logo"]').each(function () {
      var $img = $(this);
      var currentSrc = $img.attr("src");
      if (!currentSrc) return;
      var newSrc = currentSrc.replace(
        /logo(_siyah|_beyaz)?\.png/i,
        isDark ? "logo_beyaz.png" : "logo_siyah.png"
      );
      if (currentSrc !== newSrc) {
        $img.attr("src", newSrc);
      }
      // Logo görseli yüklendiğinde üst menünün yüksekliğini sıfırla ki alt kısım kapanmasın
      $img.off("load.navbarfix").on("load.navbarfix", function () {
        $(".rd-navbar-wrap").css("height", "auto");
        $window.trigger("resize.navbar");
      });
    });
    $(".rd-navbar-wrap").css("height", "auto");
  }

  function isScrolledIntoView(elem) {
    if (isNoviBuilder) return true;
    var top = elem.offset().top;
    var scrollTop = $window.scrollTop();
    return top + elem.outerHeight() >= scrollTop && top <= scrollTop + $window.height();
  }

  $(function () {
    isNoviBuilder = window.xMode;

    // Sabit üst menü (Sticky Navbar) yüksekliği kadar kaydırma payı
    var HEADER_OFFSET = 80;

    // İlk yüklemede tema logosunu ayarla
    updateThemeLogos($html.hasClass("dark-mode"));

    // Proje kartlarındaki bağlantıların yayılımını (satır içi onclick kullanmadan) durdur
    $document.on("click", ".box-icon-modern-title a", function (e) {
      e.stopPropagation();
    });

    // Dış sayfadan (örn: makalelerim/*.html -> index.html#makalelerim) gelindiğinde tam hedefe hizalama fonksiyonu
    function alignToHashTarget(animate) {
      var hash = window.location.hash;
      if (hash && hash.length > 1) {
        try {
          var $target = $(decodeURIComponent(hash));
          if ($target.length) {
            var targetTop = Math.max(0, $target.offset().top - HEADER_OFFSET);
            if (animate) {
              $("html, body").stop().animate({ scrollTop: targetTop }, 350);
            } else {
              window.scrollTo(0, targetTop);
            }
          }
        } catch (err) {}
      }
    }

    // 1. Üst Sayfa Kaydırma İlerleme Çubuğu (requestAnimationFrame ile optimize edildi)
    if (!$("#scroll-progress").length) {
      $body.prepend('<div id="scroll-progress"></div>');
    }
    var progressBar = document.getElementById("scroll-progress");
    var isTicking = false;

    function updateScrollProgress() {
      if (progressBar) {
        var scrollTop = $window.scrollTop(),
          docHeight = $document.height() - $window.height(),
          scrollPercent = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
        progressBar.style.width = scrollPercent + "%";
      }
      isTicking = false;
    }

    $window.on("scroll resize", function () {
      if (!isTicking) {
        window.requestAnimationFrame(updateScrollProgress);
        isTicking = true;
      }
    });

    // 2. Tema (Aydınlık/Karanlık) Düğmesi
    var moonSvg = '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
      sunSvg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    if (!$("#theme-toggle").length) {
      var isDarkInitial = $html.hasClass("dark-mode");
      $body.append(
        '<button id="theme-toggle" class="theme-toggle-btn" title="Tema (Aydınlık/Karanlık)" aria-label="Tema (Aydınlık/Karanlık)">' +
          (isDarkInitial ? sunSvg : moonSvg) +
        "</button>"
      );
    }

    $document.on("click", "#theme-toggle", function () {
      $html.toggleClass("dark-mode");
      var isDark = $html.hasClass("dark-mode");
      $(this).html(isDark ? sunSvg : moonSvg);
      updateThemeLogos(isDark);
      try {
        localStorage.setItem("sn_theme", isDark ? "dark" : "light");
      } catch (e) {}
    });

    // 3. Kitap Kapaklarına Tıklayınca Büyüteç, Google Play Kitap ve Kobo Linklerinin Açılması (Mobil & Masaüstü)
    $document.on("click", ".thumbnail-classic", function (e) {
      if ($(e.target).closest(".thumbnail-classic-caption a").length) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      var $card = $(this);
      var isAlreadyOpen = $card.hasClass("active-caption");

      $(".thumbnail-classic.active-caption").removeClass("active-caption");
      if (!isAlreadyOpen) {
        $card.addClass("active-caption");
      }
    });

    // Kitap kartı dışına tıklandığında açık olan kitap menüsünü kapat
    $document.on("click touchstart", function (e) {
      if (!$(e.target).closest(".thumbnail-classic").length) {
        $(".thumbnail-classic.active-caption").removeClass("active-caption");
      }
    });

    // 4. Makale Sayfaları: İçindekiler (TOC) Yumuşak Kaydırma ve Aktif Bölüm Takibi (ScrollSpy)
    var $tocLinks = $(".toc-list a[href^='#']");
    if ($tocLinks.length) {
      $tocLinks.on("click", function (e) {
        var targetId = $(this).attr("href");
        var $targetSection = $(targetId);
        if ($targetSection.length) {
          e.preventDefault();
          var offsetTop = Math.max(0, $targetSection.offset().top - HEADER_OFFSET);
          $("html, body").stop().animate({ scrollTop: offsetTop }, 400);
          if (history.replaceState) {
            history.replaceState(null, null, targetId);
          }
        }
      });

      var $sections = $(".article-section-card[id]");
      $window.on("scroll.tocspy", function () {
        var scrollPos = $window.scrollTop() + HEADER_OFFSET + 40;
        var currentId = "";
        $sections.each(function () {
          if ($(this).offset().top <= scrollPos) {
            currentId = "#" + $(this).attr("id");
          }
        });
        if (currentId) {
          $tocLinks.removeClass("active-toc");
          $tocLinks.filter('[href="' + currentId + '"]').addClass("active-toc");
        }
      }).trigger("scroll.tocspy");
    }

    // 5. Makalelerim Okuma Pencereleri (Modal) Kontrolü
    $document.on("click", "[data-article-modal]", function (e) {
      e.preventDefault();
      var targetModal = $(this).attr("data-article-modal");
      $(targetModal).addClass("active").attr("aria-hidden", "false");
    });

    $document.on("click", "[data-close-modal], .article-modal-overlay", function (e) {
      if (e.target === this || $(e.target).is("[data-close-modal]")) {
        $(".article-modal-overlay.active").removeClass("active").attr("aria-hidden", "true");
      }
    });

    $document.on("keydown", function (e) {
      if (e.key === "Escape") {
        $(".thumbnail-classic.active-caption").removeClass("active-caption");
        if ($(".article-modal-overlay.active").length) {
          $(".article-modal-overlay.active").removeClass("active").attr("aria-hidden", "true");
        }
      }
    });

    // Page loader & Page transition
    if (plugins.preloader.length && !isNoviBuilder && typeof pageTransition === "function") {
      pageTransition({
        target: document.querySelector(".page"),
        delay: 100,
        duration: 500,
        classIn: "fadeIn",
        classOut: "fadeOut",
        classActive: "animated",
        conditions: function (event, link) {
          return (
            !/(\#|callto:|tel:|mailto:|:\/\/)/.test(link) &&
            !event.currentTarget.hasAttribute("data-lightgallery") &&
            !event.currentTarget.hasAttribute("data-article-modal") &&
            event.currentTarget.getAttribute("target") !== "_blank"
          );
        },
        onTransitionStart: function (options) {
          setTimeout(function () {
            plugins.preloader.removeClass("loaded");
          }, options.duration * 0.75);
        },
        onReady: function () {
          plugins.preloader.addClass("loaded");
          windowReady = true;
          $(".rd-navbar-wrap").css("height", "auto");
          alignToHashTarget(false);
        }
      });

      setTimeout(function () {
        if (!windowReady && !isNoviBuilder) plugins.preloader.addClass("loaded");
      }, 2000);
    }

    function getSwiperHeight(object, attr) {
      var val = object.attr("data-" + attr),
        dim;
      if (!val) return undefined;
      dim = val.match(/(px)|(%)|(vh)|(vw)$/i);
      if (dim && dim.length) {
        switch (dim[0]) {
          case "px":
            return parseFloat(val);
          case "vh":
            return $window.height() * (parseFloat(val) / 100);
          case "vw":
            return $window.width() * (parseFloat(val) / 100);
          case "%":
            return object.width() * (parseFloat(val) / 100);
        }
      }
      return undefined;
    }

    function toggleSwiperInnerVideos(swiper) {
      var prevSlide = $(swiper.slides[swiper.previousIndex]),
        nextSlide = $(swiper.slides[swiper.activeIndex]),
        videos,
        videoItems = prevSlide.find("video");

      for (var i = 0; i < videoItems.length; i++) {
        videoItems[i].pause();
      }
      videos = nextSlide.find("video");
      if (videos.length) {
        videos.get(0).play();
      }
    }

    function toggleSwiperCaptionAnimation(swiper) {
      var prevSlide = $(swiper.container).find("[data-caption-animate]"),
        nextSlide = $(swiper.slides[swiper.activeIndex]).find("[data-caption-animate]"),
        delay,
        duration,
        nextSlideItem,
        prevSlideItem;

      for (var i = 0; i < prevSlide.length; i++) {
        prevSlideItem = $(prevSlide[i]);
        prevSlideItem.removeClass("animated").removeClass(prevSlideItem.attr("data-caption-animate")).addClass("not-animated");
      }

      var tempFunction = function (nextSlideItem, duration) {
        return function () {
          nextSlideItem.removeClass("not-animated").addClass(nextSlideItem.attr("data-caption-animate")).addClass("animated");
          if (duration) {
            nextSlideItem.css("animation-duration", duration + "ms");
          }
        };
      };

      for (var j = 0; j < nextSlide.length; j++) {
        nextSlideItem = $(nextSlide[j]);
        delay = nextSlideItem.attr("data-caption-delay");
        duration = nextSlideItem.attr("data-caption-duration");
        if (!isNoviBuilder) {
          if (delay) {
            setTimeout(tempFunction(nextSlideItem, duration), parseInt(delay, 10));
          } else {
            tempFunction(nextSlideItem, duration)();
          }
        } else {
          nextSlideItem.removeClass("not-animated");
        }
      }
    }

    // LightGallery Başlatıcılar
    function initLightGallery(itemsToInit, addClass) {
      if (!isNoviBuilder && $.fn.lightGallery) {
        $(itemsToInit).lightGallery({
          thumbnail: $(itemsToInit).attr("data-lg-thumbnail") !== "false",
          selector: "[data-lightgallery='item']",
          autoplay: $(itemsToInit).attr("data-lg-autoplay") === "true",
          pause: parseInt($(itemsToInit).attr("data-lg-autoplay-delay"), 10) || 5000,
          addClass: addClass,
          mode: $(itemsToInit).attr("data-lg-animation") || "lg-slide",
          loop: $(itemsToInit).attr("data-lg-loop") !== "false",
          share: false,
          download: true,
          fullScreen: true
        });
      }
    }

    function initDynamicLightGallery(itemsToInit, addClass) {
      if (!isNoviBuilder && $.fn.lightGallery) {
        $(itemsToInit).on("click", function () {
          $(itemsToInit).lightGallery({
            thumbnail: $(itemsToInit).attr("data-lg-thumbnail") !== "false",
            selector: "[data-lightgallery='item']",
            autoplay: $(itemsToInit).attr("data-lg-autoplay") === "true",
            pause: parseInt($(itemsToInit).attr("data-lg-autoplay-delay"), 10) || 5000,
            addClass: addClass,
            mode: $(itemsToInit).attr("data-lg-animation") || "lg-slide",
            loop: $(itemsToInit).attr("data-lg-loop") !== "false",
            share: false,
            download: true,
            fullScreen: true,
            dynamic: true,
            dynamicEl: JSON.parse($(itemsToInit).attr("data-lg-dynamic-elements")) || []
          });
        });
      }
    }

    function initLightGalleryItem(itemToInit, addClass) {
      if (!isNoviBuilder && $.fn.lightGallery) {
        $(itemToInit).lightGallery({
          selector: "this",
          addClass: addClass,
          counter: false,
          share: false,
          download: true,
          fullScreen: true
        });
      }
    }

    // LightGallery Fullscreen ve Doğrudan İndirme Yaması
    if (!document.cancelFullScreen) {
      document.cancelFullScreen = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.msExitFullscreen;
    }

    if ($.fn.lightGallery && $.fn.lightGallery.modules && $.fn.lightGallery.modules.fullscreen) {
      $.fn.lightGallery.modules.fullscreen.prototype.requestFullscreen = function () {
        var el = document.documentElement;
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          el.msRequestFullscreen();
        }
      };

      $.fn.lightGallery.modules.fullscreen.prototype.exitFullscreen = function () {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      };

      $.fn.lightGallery.modules.fullscreen.prototype.fullScreen = function () {
        var _this = this;
        $(document).off("fullscreenchange.lg webkitfullscreenchange.lg mozfullscreenchange.lg MSFullscreenChange.lg");
        $(document).on("fullscreenchange.lg webkitfullscreenchange.lg mozfullscreenchange.lg MSFullscreenChange.lg", function () {
          var isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
          _this.core.$outer.toggleClass("lg-fullscreen-on", isFull);
        });

        this.core.$outer.find(".lg-fullscreen").off("click.lg").on("click.lg", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
          if (isFull) {
            _this.exitFullscreen();
          } else {
            _this.requestFullscreen();
          }
        });
      };
    }

    $document.on("click", "#lg-download", function (e) {
      e.preventDefault();
      e.stopPropagation();

      var downloadUrl = $(this).attr("href") || $(".lg-current .lg-image").attr("src");
      if (!downloadUrl) return;

      var fileName = downloadUrl.split("/").pop().split("?")[0] || "kitap-kapak.jpg";

      fetch(downloadUrl)
        .then(function (response) {
          if (!response.ok) throw new Error("Network error");
          return response.blob();
        })
        .then(function (blob) {
          var blobUrl = window.URL.createObjectURL(blob);
          var link = document.createElement("a");
          link.style.display = "none";
          link.href = blobUrl;
          link.setAttribute("download", fileName);
          document.body.appendChild(link);
          link.click();
          setTimeout(function () {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
          }, 200);
        })
        .catch(function () {
          var link = document.createElement("a");
          link.href = downloadUrl;
          link.setAttribute("download", fileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    });

    if (navigator.platform.match(/(Mac)/i)) {
      $html.addClass("mac-os");
    }

    if (isIE) {
      if (isIE === 12) $html.addClass("ie-edge");
      if (isIE === 11) $html.addClass("ie-11");
      if (isIE < 10) $html.addClass("lt-ie-10");
      if (isIE < 11) $html.addClass("ie-10");
    }

    // Copyright Year
    if (plugins.copyrightYear.length) {
      plugins.copyrightYear.text(initialDate.getFullYear());
    }

    // UI To Top
    if (isDesktop && !isNoviBuilder && $.fn.UItoTop) {
      $().UItoTop({
        easingType: "easeOutQuad",
        containerClass: "ui-to-top fa fa-angle-up"
      });
    }

    // lightGallery Group
    if (plugins.lightGallery.length) {
      for (var i = 0; i < plugins.lightGallery.length; i++) {
        initLightGallery(plugins.lightGallery[i]);
      }
    }

    // lightGallery Item
    if (plugins.lightGalleryItem.length) {
      var notCarouselItems = [];
      for (var z = 0; z < plugins.lightGalleryItem.length; z++) {
        if (
          !$(plugins.lightGalleryItem[z]).parents(".owl-carousel").length &&
          !$(plugins.lightGalleryItem[z]).parents(".swiper-slider").length &&
          !$(plugins.lightGalleryItem[z]).parents(".slick-slider").length &&
          !$(plugins.lightGalleryItem[z]).parents('[data-lightgallery="group"]').length
        ) {
          notCarouselItems.push(plugins.lightGalleryItem[z]);
        }
      }
      plugins.lightGalleryItem = notCarouselItems;
      for (var k = 0; k < plugins.lightGalleryItem.length; k++) {
        initLightGalleryItem(plugins.lightGalleryItem[k]);
      }
    }

    // Dynamic lightGallery
    if (plugins.lightDynamicGalleryItem.length) {
      for (var m = 0; m < plugins.lightDynamicGalleryItem.length; m++) {
        initDynamicLightGallery(plugins.lightDynamicGalleryItem[m]);
      }
    }

    // RD Navbar
    if (plugins.rdNavbar.length && $.fn.RDNavbar) {
      var aliaces = ["-", "-sm-", "-md-", "-lg-", "-xl-", "-xxl-"],
        values = [0, 576, 768, 992, 1200, 1600],
        responsiveNavbar = {};

      for (var n = 0; n < values.length; n++) {
        var value = values[n];
        if (!responsiveNavbar[value]) {
          responsiveNavbar[value] = {};
        }
        responsiveNavbar[value].anchorNavOffset = -HEADER_OFFSET;
        responsiveNavbar[value].autoHeight = false;

        if (plugins.rdNavbar.attr("data" + aliaces[n] + "layout")) {
          responsiveNavbar[value].layout = plugins.rdNavbar.attr("data" + aliaces[n] + "layout");
        }
        if (plugins.rdNavbar.attr("data" + aliaces[n] + "device-layout")) {
          responsiveNavbar[value].deviceLayout = plugins.rdNavbar.attr("data" + aliaces[n] + "device-layout");
        }
        if (plugins.rdNavbar.attr("data" + aliaces[n] + "hover-on")) {
          responsiveNavbar[value].focusOnHover = plugins.rdNavbar.attr("data" + aliaces[n] + "hover-on") === "true";
        }
        if (isNoviBuilder) {
          responsiveNavbar[value].stickUp = false;
        } else if (plugins.rdNavbar.attr("data" + aliaces[n] + "stick-up")) {
          responsiveNavbar[value].stickUp = plugins.rdNavbar.attr("data" + aliaces[n] + "stick-up") === "true";
        }
        if (plugins.rdNavbar.attr("data" + aliaces[n] + "stick-up-offset")) {
          responsiveNavbar[value].stickUpOffset = plugins.rdNavbar.attr("data" + aliaces[n] + "stick-up-offset");
        }
      }

      plugins.rdNavbar.RDNavbar({
        anchorNav: !isNoviBuilder,
        anchorNavOffset: -HEADER_OFFSET,
        autoHeight: false,
        stickUpClone: plugins.rdNavbar.attr("data-stick-up-clone") && !isNoviBuilder ? plugins.rdNavbar.attr("data-stick-up-clone") === "true" : false,
        responsive: responsiveNavbar
      });

      // RDNavbar klonu oluşturulduktan sonra tema logosunu tekrar eşitle
      updateThemeLogos($html.hasClass("dark-mode"));

      if (plugins.rdNavbar.attr("data-body-class")) {
        document.body.className += " " + plugins.rdNavbar.attr("data-body-class");
      }
    }

    // Swiper
    if (plugins.swiper.length && $.fn.swiper) {
      for (var p = 0; p < plugins.swiper.length; p++) {
        var s = $(plugins.swiper[p]);
        var pag = s.find(".swiper-pagination"),
          next = s.find(".swiper-button-next"),
          prev = s.find(".swiper-button-prev"),
          bar = s.find(".swiper-scrollbar"),
          swiperSlide = s.find(".swiper-slide");

        for (var q = 0; q < swiperSlide.length; q++) {
          var $thisSlide = $(swiperSlide[q]),
            url = $thisSlide.attr("data-slide-bg");
          if (url) {
            $thisSlide.css({
              "background-image": "url(" + url + ")",
              "background-size": "cover"
            });
          }
        }

        swiperSlide.end().find("[data-caption-animate]").addClass("not-animated").end();

        s.swiper({
          autoplay: s.attr("data-autoplay") ? (s.attr("data-autoplay") === "false" ? undefined : s.attr("data-autoplay")) : 5000,
          direction: s.attr("data-direction") && isDesktop ? s.attr("data-direction") : "horizontal",
          effect: s.attr("data-slide-effect") ? s.attr("data-slide-effect") : "slide",
          speed: s.attr("data-slide-speed") ? s.attr("data-slide-speed") : 600,
          keyboardControl: s.attr("data-keyboard") === "true",
          mousewheelControl: s.attr("data-mousewheel") === "true",
          mousewheelReleaseOnEdges: s.attr("data-mousewheel-release") === "true",
          nextButton: next.length ? next.get(0) : null,
          prevButton: prev.length ? prev.get(0) : null,
          pagination: pag.length ? pag.get(0) : null,
          paginationClickable: pag.length ? pag.attr("data-clickable") !== "false" : false,
          paginationBulletRender: function (swiper, index, className) {
            if (pag.attr("data-index-bullet") === "true") {
              return '<span class="' + className + '">' + (index + 1) + "</span>";
            } else if (pag.attr("data-bullet-custom") === "true") {
              return '<span class="' + className + '"><span></span></span>';
            } else {
              return '<span class="' + className + '"></span>';
            }
          },
          scrollbar: bar.length ? bar.get(0) : null,
          scrollbarDraggable: bar.length ? bar.attr("data-draggable") !== "false" : true,
          scrollbarHide: bar.length ? bar.attr("data-draggable") === "false" : false,
          loop: isNoviBuilder ? false : s.attr("data-loop") !== "false",
          simulateTouch: s.attr("data-simulate-touch") && !isNoviBuilder ? s.attr("data-simulate-touch") === "true" : false,
          onTransitionStart: function (swiper) {
            toggleSwiperInnerVideos(swiper);
          },
          onTransitionEnd: function (swiper) {
            toggleSwiperCaptionAnimation(swiper);
          },
          onInit: (function (s) {
            return function (swiper) {
              toggleSwiperInnerVideos(swiper);
              toggleSwiperCaptionAnimation(swiper);

              var $swiper = $(s),
                swiperCustomIndex = $swiper.find(".swiper-pagination__fraction-index").get(0),
                swiperCustomCount = $swiper.find(".swiper-pagination__fraction-count").get(0);

              if (swiperCustomIndex && swiperCustomCount) {
                swiperCustomIndex.innerHTML = formatIndex(swiper.realIndex + 1);
                if (isNoviBuilder ? false : s.attr("data-loop") !== "false") {
                  swiperCustomCount.innerHTML = formatIndex(swiper.slides.length - 2);
                } else {
                  swiperCustomCount.innerHTML = formatIndex(swiper.slides.length);
                }
              }
            };
          })(s),
          onSlideChangeStart: (function (s) {
            return function (swiper) {
              var swiperCustomIndex = $(s).find(".swiper-pagination__fraction-index").get(0);
              if (swiperCustomIndex) {
                swiperCustomIndex.innerHTML = formatIndex(swiper.realIndex + 1);
              }
            };
          })(s)
        });

        $window
          .on(
            "resize",
            (function (s) {
              return function () {
                var mh = getSwiperHeight(s, "min-height"),
                  h = getSwiperHeight(s, "height");
                if (h) {
                  s.css("height", mh ? (mh > h ? mh : h) : h);
                }
              };
            })(s)
          )
          .trigger("resize");
      }
    }

    function formatIndex(index) {
      return index < 10 ? "0" + index : index;
    }

    // Kitaplarım: Ardışık Dalga (Staggered Cascade) Animasyonlu Kategori Filtreleme
    if (plugins.isotope.length) {
      plugins.isotope.addClass("isotope--loaded");
      var filterTimer = null;

      $("[data-isotope-filter]").on("click", function (e) {
        e.preventDefault();
        var $filterBtn = $(this);
        if ($filterBtn.hasClass("active")) return;

        var filterValue = $filterBtn.attr("data-isotope-filter"),
          group = $filterBtn.attr("data-isotope-group"),
          $grid = $('.isotope[data-isotope-group="' + group + '"]'),
          $items = $grid.find(".isotope-item");

        $filterBtn.closest(".isotope-filters").find(".active").removeClass("active");
        $filterBtn.addClass("active");

        $(".thumbnail-classic.active-caption").removeClass("active-caption");
        $("#isotope-3, .isotope-filters-toggle").removeClass("active");

        if (filterTimer) clearTimeout(filterTimer);

        $items.not(".filter-hidden").removeClass("filter-visible").addClass("filter-exiting");

        filterTimer = setTimeout(function () {
          var visibleIndex = 0;
          $items.each(function () {
            var $item = $(this),
              itemType = $item.attr("data-filter") || "";

            $item.removeClass("filter-exiting filter-visible");

            if (filterValue === "*" || itemType.indexOf(filterValue) !== -1) {
              $item.removeClass("filter-hidden");
              this.style.setProperty("--stagger-delay", (visibleIndex * 40) + "ms");
              void this.offsetWidth;
              $item.addClass("filter-visible");
              visibleIndex++;
            } else {
              $item.addClass("filter-hidden");
              this.style.removeProperty("--stagger-delay");
            }
          });
        }, 170);
      });
    }

    // Sayfa yüklendiğinde URL'de #makalelerim vb. varsa tam hedefe hizala
    $window.on("load", function () {
      $(".rd-navbar-wrap").css("height", "auto");
      alignToHashTarget(false);
    });

    // WOW
    if ($html.hasClass("wow-animation") && plugins.wow.length && !isNoviBuilder && isDesktop && typeof WOW === "function") {
      new WOW().init();
    }

    // Custom Toggles
    if (plugins.customToggle.length) {
      for (var t = 0; t < plugins.customToggle.length; t++) {
        var $toggle = $(plugins.customToggle[t]);

        $toggle.on(
          "click",
          $.proxy(function (event) {
            event.preventDefault();
            var $ctx = $(this);
            $($ctx.attr("data-custom-toggle")).add(this).toggleClass("active");
          }, $toggle)
        );

        if ($toggle.attr("data-custom-toggle-hide-on-blur") === "true") {
          $body.on("click", $toggle, function (e) {
            if (e.target !== e.data[0] && $(e.data.attr("data-custom-toggle")).find($(e.target)).length && e.data.find($(e.target)).length === 0) {
              $(e.data.attr("data-custom-toggle")).add(e.data[0]).removeClass("active");
            }
          });
        }

        if ($toggle.attr("data-custom-toggle-disable-on-blur") === "true") {
          $body.on("click", $toggle, function (e) {
            if (e.target !== e.data[0] && $(e.data.attr("data-custom-toggle")).find($(e.target)).length === 0 && e.data.find($(e.target)).length === 0) {
              $(e.data.attr("data-custom-toggle")).add(e.data[0]).removeClass("active");
            }
          });
        }
      }
    }

    // jQuery Count To (Tekil scroll dinleyicisi ile optimize edildi, tamamlanınca dinleyici kaldırılır)
    if (plugins.counter.length && $.fn.countTo) {
      var checkCounters = function () {
        var remaining = 0;
        plugins.counter.each(function () {
          var $this = $(this);
          if (!$this.hasClass("animated")) {
            if (isScrolledIntoView($this)) {
              $this.countTo({
                refreshInterval: 40,
                from: 0,
                to: parseInt($this.text(), 10),
                speed: $this.attr("data-speed") || 1000
              });
              $this.addClass("animated");
            } else {
              remaining++;
            }
          }
        });
        if (remaining === 0) {
          $window.off("scroll.counter");
        }
      };
      $window.on("scroll.counter", checkCounters);
      checkCounters();
    }
  });
})();
