(function ($) {
    'use strict';

    console.log('[CCF] Script loaded');
    console.log('[CCF] ccf_data:', typeof ccf_data !== 'undefined' ? ccf_data : 'UNDEFINED');

    if (typeof ccf_data === 'undefined') {
        console.error('[CCF] ccf_data no está definido. El script no se inicializó correctamente.');
        return;
    }

    var ajaxUrl = ccf_data.ajax_url;
    var nonce = ccf_data.nonce;

    console.log('[CCF] ajax_url:', ajaxUrl);
    console.log('[CCF] nonce:', nonce);

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
     * Log form state for debugging.
     */
    function logFormState(action, $form) {
        console.log('[CCF] --- ' + action + ' ---');
        console.log('[CCF] product_id:', getProductId($form));
        console.log('[CCF] cart_key:', getCartKey($form));
        console.log('[CCF] in_cart:', $form.attr('data-in-cart'));
        console.log('[CCF] qty:', $form.find('.ccf-qty-input').val());
        console.log('[CCF] form element:', $form[0]);
    }

    /**
     * Apply WC fragments and update all cart-related elements on the page.
     */
    function refreshCart(data) {
        console.log('[CCF] refreshCart data:', data);

        // Apply WooCommerce fragments (mini-cart, widget, etc.)
        if (data.fragments) {
            console.log('[CCF] Applying fragments:', Object.keys(data.fragments));
            $.each(data.fragments, function (selector, html) {
                var $el = $(selector);
                console.log('[CCF] Fragment selector "' + selector + '" found:', $el.length, 'elements');
                $el.replaceWith(html);
            });
        } else {
            console.warn('[CCF] No fragments in response');
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
        var countSelectors = '.cart-count, .cart-contents-count, .woocommerce-cart-count, .brx-cart-count';
        console.log('[CCF] Updating cart count to:', count, '| Elements found:', $(countSelectors).length);
        $(countSelectors).text(count);

        // Update cart totals text if present on page
        if (data.cart_total) {
            var $totalEls = $('.cart-total-amount, .woocommerce-cart-total .amount, .order-total .amount');
            console.log('[CCF] Cart total elements found:', $totalEls.length, '| New total:', data.cart_total);
            $totalEls.last().html(data.cart_total);
        }
        if (data.cart_subtotal) {
            var $subEls = $('.cart-subtotal .amount');
            console.log('[CCF] Cart subtotal elements found:', $subEls.length, '| New subtotal:', data.cart_subtotal);
            $subEls.html(data.cart_subtotal);
        }

        // Custom event for other scripts to hook into
        $(document.body).trigger('ccf_cart_updated', [data]);

        console.log('[CCF] refreshCart complete');
    }

    /**
     * Add product to cart.
     */
    function addToCart($form, qty) {
        var productId = getProductId($form);
        logFormState('addToCart', $form);
        console.log('[CCF] Adding to cart: product_id=' + productId + ', qty=' + qty);
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
                refreshCart(res.data);
            } else {
                console.error('[CCF] addToCart FAILED:', res.data);
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.error('[CCF] addToCart AJAX error:', textStatus, errorThrown);
            console.error('[CCF] Response:', jqXHR.responseText);
            setLoading($form, false);
        });
    }

    /**
     * Update cart item quantity.
     */
    function updateQty($form, qty) {
        var cartKey = getCartKey($form);
        logFormState('updateQty', $form);
        console.log('[CCF] Updating qty: cart_key=' + cartKey + ', qty=' + qty);
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
                refreshCart(res.data);
            } else {
                console.error('[CCF] updateQty FAILED:', res.data);
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.error('[CCF] updateQty AJAX error:', textStatus, errorThrown);
            console.error('[CCF] Response:', jqXHR.responseText);
            setLoading($form, false);
        });
    }

    /**
     * Remove item from cart — sends both cart_key and product_id for fallback.
     */
    function removeItem($form) {
        var cartKey = getCartKey($form);
        var productId = getProductId($form);
        logFormState('removeItem', $form);
        console.log('[CCF] Removing: cart_key=' + cartKey + ', product_id=' + productId);
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_remove_item',
            nonce: nonce,
            cart_key: cartKey,
            product_id: productId
        }, function (res) {
            console.log('[CCF] removeItem response:', res);
            setLoading($form, false);
            if (res.success) {
                $form.attr('data-cart-key', '');
                $form.attr('data-in-cart', '0');
                $form.find('.ccf-qty-input').val(0);
                $form.find('.ccf-remove').hide();
                refreshCart(res.data);

                // Trigger WC native removed event
                $(document.body).trigger('removed_from_cart');
                console.log('[CCF] Item removed successfully');
            } else {
                console.error('[CCF] removeItem FAILED:', res.data);
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.error('[CCF] removeItem AJAX error:', textStatus, errorThrown);
            console.error('[CCF] Response:', jqXHR.responseText);
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
            console.error('[CCF] No .ccf-cart-form parent found for trash button');
            return;
        }
        removeItem($form);
    });

    // ── Init: log all forms found on page ──
    $(document).ready(function () {
        var $forms = $('.ccf-cart-form');
        console.log('[CCF] Forms found on page:', $forms.length);
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
