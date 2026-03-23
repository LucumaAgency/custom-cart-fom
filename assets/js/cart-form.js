(function ($) {
    'use strict';

    if (typeof ccf_data === 'undefined') return;

    var ajaxUrl = ccf_data.ajax_url;
    var nonce = ccf_data.nonce;

    /**
     * Read data attributes via .attr() to avoid jQuery .data() caching issues.
     */
    function getCartKey($form) {
        return $form.attr('data-cart-key') || '';
    }

    function getProductId($form) {
        return $form.attr('data-product-id') || '';
    }

    function isInCart($form) {
        return $form.attr('data-in-cart') === '1';
    }

    function setLoading($form, loading) {
        $form.toggleClass('ccf-loading', loading);
    }

    /**
     * Apply WC fragments and update all cart-related elements on the page.
     */
    function refreshCart(data) {
        // Apply WooCommerce fragments (mini-cart, widget, etc.)
        if (data.fragments) {
            $.each(data.fragments, function (selector, html) {
                $(selector).replaceWith(html);
            });
        }

        // Store cart hash
        if (data.cart_hash) {
            sessionStorage.setItem('wc_cart_hash', data.cart_hash);
        }

        // Trigger WC native events so other plugins/themes react
        $(document.body).trigger('wc_fragment_refresh');
        $(document.body).trigger('wc_fragments_refreshed');
        $(document.body).trigger('added_to_cart');
        $(document.body).trigger('updated_wc_div');

        // Update common cart count selectors (themes, Bricks, etc.)
        var count = data.cart_count;
        $('.cart-count, .cart-contents-count, .woocommerce-cart-count, .brx-cart-count').text(count);

        // Update cart totals text if present on page
        if (data.cart_total) {
            $('.cart-total-amount, .woocommerce-cart-total .amount, .order-total .amount').last().html(data.cart_total);
        }
        if (data.cart_subtotal) {
            $('.cart-subtotal .amount').html(data.cart_subtotal);
        }

        // Custom event for other scripts to hook into
        $(document.body).trigger('ccf_cart_updated', [data]);
    }

    /**
     * Add product to cart.
     */
    function addToCart($form, qty) {
        var productId = getProductId($form);
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_add_to_cart',
            nonce: nonce,
            product_id: productId,
            qty: qty
        }, function (res) {
            setLoading($form, false);
            if (res.success) {
                $form.attr('data-cart-key', res.data.cart_key);
                $form.attr('data-in-cart', '1');
                $form.find('.ccf-remove').show();
                refreshCart(res.data);
            }
        }).fail(function () {
            setLoading($form, false);
        });
    }

    /**
     * Update cart item quantity.
     */
    function updateQty($form, qty) {
        var cartKey = getCartKey($form);
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_update_qty',
            nonce: nonce,
            cart_key: cartKey,
            qty: qty
        }, function (res) {
            setLoading($form, false);
            if (res.success) {
                refreshCart(res.data);
            }
        }).fail(function () {
            setLoading($form, false);
        });
    }

    /**
     * Remove item from cart — sends both cart_key and product_id for fallback.
     */
    function removeItem($form) {
        var cartKey = getCartKey($form);
        var productId = getProductId($form);
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_remove_item',
            nonce: nonce,
            cart_key: cartKey,
            product_id: productId
        }, function (res) {
            setLoading($form, false);
            if (res.success) {
                $form.attr('data-cart-key', '');
                $form.attr('data-in-cart', '0');
                $form.find('.ccf-qty-input').val(0);
                $form.find('.ccf-remove').hide();
                refreshCart(res.data);

                // Trigger WC native removed event
                $(document.body).trigger('removed_from_cart');
            }
        }).fail(function () {
            setLoading($form, false);
        });
    }

    // ── Event: Plus button ──
    $(document).on('click', '.ccf-plus', function () {
        var $form = $(this).closest('.ccf-cart-form');
        var $input = $form.find('.ccf-qty-input');
        var current = parseInt($input.val(), 10) || 0;
        var newQty = current + 1;

        $input.val(newQty);

        if (isInCart($form)) {
            updateQty($form, newQty);
        } else {
            addToCart($form, newQty);
        }
    });

    // ── Event: Minus button ──
    $(document).on('click', '.ccf-minus', function () {
        var $form = $(this).closest('.ccf-cart-form');
        var $input = $form.find('.ccf-qty-input');
        var current = parseInt($input.val(), 10) || 0;

        if (current <= 1) {
            if (isInCart($form)) {
                removeItem($form);
            }
            return;
        }

        var newQty = current - 1;
        $input.val(newQty);

        if (isInCart($form)) {
            updateQty($form, newQty);
        }
    });

    // ── Event: Remove / trash button ──
    $(document).on('click', '.ccf-remove', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var $form = $(this).closest('.ccf-cart-form');
        removeItem($form);
    });

})(jQuery);
