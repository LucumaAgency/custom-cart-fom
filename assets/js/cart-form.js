(function ($) {
    'use strict';

    if (typeof ccf_data === 'undefined') return;

    var ajaxUrl = ccf_data.ajax_url;
    var nonce = ccf_data.nonce;

    /**
     * Set loading state on a form.
     */
    function setLoading($form, loading) {
        $form.toggleClass('ccf-loading', loading);
    }

    /**
     * Update all WooCommerce cart fragments/widgets on the page.
     */
    function refreshCartFragments(data) {
        // Trigger WC fragment refresh
        $(document.body).trigger('wc_fragment_refresh');

        // Update any cart totals/counts on the page
        $(document.body).trigger('ccf_cart_updated', [data]);

        // Update Bricks-specific or theme cart count elements
        $('.cart-count, .cart-contents-count, .woocommerce-cart-count').text(data.cart_count);
    }

    /**
     * Add product to cart.
     */
    function addToCart($form, qty) {
        var productId = $form.data('product-id');
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_add_to_cart',
            nonce: nonce,
            product_id: productId,
            qty: qty
        }, function (res) {
            setLoading($form, false);
            if (res.success) {
                $form.data('cart-key', res.data.cart_key);
                $form.data('in-cart', '1');
                $form.find('.ccf-remove').show();
                refreshCartFragments(res.data);
            }
        }).fail(function () {
            setLoading($form, false);
        });
    }

    /**
     * Update cart item quantity.
     */
    function updateQty($form, qty) {
        var cartKey = $form.data('cart-key');
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_update_qty',
            nonce: nonce,
            cart_key: cartKey,
            qty: qty
        }, function (res) {
            setLoading($form, false);
            if (res.success) {
                refreshCartFragments(res.data);
            }
        }).fail(function () {
            setLoading($form, false);
        });
    }

    /**
     * Remove item from cart.
     */
    function removeItem($form) {
        var cartKey = $form.data('cart-key');
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_remove_item',
            nonce: nonce,
            cart_key: cartKey
        }, function (res) {
            setLoading($form, false);
            if (res.success) {
                $form.data('cart-key', '');
                $form.data('in-cart', '0');
                $form.find('.ccf-qty-input').val(0);
                $form.find('.ccf-remove').hide();
                refreshCartFragments(res.data);
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

        if ($form.data('in-cart') === 1 || $form.data('in-cart') === '1') {
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
            // Remove from cart
            if ($form.data('in-cart') === 1 || $form.data('in-cart') === '1') {
                removeItem($form);
            }
            return;
        }

        var newQty = current - 1;
        $input.val(newQty);

        if ($form.data('in-cart') === 1 || $form.data('in-cart') === '1') {
            updateQty($form, newQty);
        }
    });

    // ── Event: Remove button ──
    $(document).on('click', '.ccf-remove', function () {
        var $form = $(this).closest('.ccf-cart-form');
        removeItem($form);
    });

})(jQuery);
