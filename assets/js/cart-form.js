(function ($) {
    'use strict';

    console.log('[CCF] Script loaded');

    if (typeof ccf_data === 'undefined') {
        console.error('[CCF] ccf_data no definido');
        return;
    }

    var ajaxUrl = ccf_data.ajax_url;
    var nonce = ccf_data.nonce;

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
     * Refresh WC cart fragments via WC's own AJAX endpoint.
     */
    function refreshWCFragments() {
        console.log('[CCF] Fetching WC fragments...');
        $.post(ajaxUrl, {
            action: 'get_refreshed_fragments' // WooCommerce native endpoint
        }, function (res) {
            console.log('[CCF] WC fragments response:', res);
            if (res && res.fragments) {
                $.each(res.fragments, function (selector, html) {
                    $(selector).replaceWith(html);
                });
                if (res.cart_hash) {
                    sessionStorage.setItem('wc_cart_hash', res.cart_hash);
                }
            }
        });
    }

    /**
     * Add product to cart.
     */
    function addToCart($form, qty) {
        var productId = getProductId($form);
        console.log('[CCF] addToCart: product_id=' + productId + ', qty=' + qty);
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_add_to_cart',
            nonce: nonce,
            product_id: productId,
            qty: qty
        }, function (res) {
            console.log('[CCF] addToCart response:', res);
            setLoading($form, false);
            if (res.success) {
                $form.attr('data-cart-key', res.data.cart_key);
                $form.attr('data-in-cart', '1');
                $form.find('.ccf-remove').show();
                refreshWCFragments();
            } else {
                console.error('[CCF] addToCart failed:', res.data);
            }
        }).fail(function (jqXHR, textStatus, err) {
            console.error('[CCF] addToCart AJAX error:', textStatus, err, jqXHR.responseText);
            setLoading($form, false);
        });
    }

    /**
     * Update cart item quantity.
     */
    function updateQty($form, qty) {
        var cartKey = getCartKey($form);
        console.log('[CCF] updateQty: cart_key=' + cartKey + ', qty=' + qty);
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_update_qty',
            nonce: nonce,
            cart_key: cartKey,
            qty: qty
        }, function (res) {
            console.log('[CCF] updateQty response:', res);
            setLoading($form, false);
            if (res.success) {
                // Reload page to reflect new prices in Bricks loop
                location.reload();
            } else {
                console.error('[CCF] updateQty failed:', res.data);
            }
        }).fail(function (jqXHR, textStatus, err) {
            console.error('[CCF] updateQty AJAX error:', textStatus, err, jqXHR.responseText);
            setLoading($form, false);
        });
    }

    /**
     * Remove item from cart.
     */
    function removeItem($form) {
        var cartKey = getCartKey($form);
        var productId = getProductId($form);
        console.log('[CCF] removeItem: cart_key=' + cartKey + ', product_id=' + productId);
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_remove_item',
            nonce: nonce,
            cart_key: cartKey,
            product_id: productId
        }, function (res) {
            console.log('[CCF] removeItem response:', res);
            if (res.success) {
                console.log('[CCF] Item removed — reloading page');
                // Reload page so the Bricks loop re-renders without the removed item
                location.reload();
            } else {
                console.error('[CCF] removeItem failed:', res.data);
                setLoading($form, false);
            }
        }).fail(function (jqXHR, textStatus, err) {
            console.error('[CCF] removeItem AJAX error:', textStatus, err, jqXHR.responseText);
            setLoading($form, false);
        });
    }

    // ── Event: Plus button ──
    $(document).on('click', '.ccf-plus', function () {
        console.log('[CCF] + clicked');
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
        console.log('[CCF] - clicked');
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
        console.log('[CCF] Trash clicked');
        var $form = $(this).closest('.ccf-cart-form');
        if (!$form.length) {
            console.error('[CCF] No .ccf-cart-form parent found');
            return;
        }
        removeItem($form);
    });

    // ── Init ──
    $(document).ready(function () {
        var $forms = $('.ccf-cart-form');
        console.log('[CCF] Forms found:', $forms.length);
        $forms.each(function (i) {
            var $f = $(this);
            console.log('[CCF] Form #' + i + ':', {
                product_id: $f.attr('data-product-id'),
                cart_key: $f.attr('data-cart-key'),
                in_cart: $f.attr('data-in-cart')
            });
        });
    });

})(jQuery);
