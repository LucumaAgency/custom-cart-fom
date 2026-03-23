(function ($) {
    'use strict';

    if (typeof ccf_data === 'undefined') return;

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

    function addToCart($form, qty) {
        var productId = getProductId($form);
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_add_to_cart',
            nonce: nonce,
            product_id: productId,
            qty: qty
        }, function (res) {
            if (res.success) {
                $form.attr('data-cart-key', res.data.cart_key);
                $form.attr('data-in-cart', '1');
                $form.find('.ccf-remove').show();
                location.reload();
            } else {
                setLoading($form, false);
            }
        }).fail(function () {
            setLoading($form, false);
        });
    }

    function updateQty($form, qty) {
        var cartKey = getCartKey($form);
        setLoading($form, true);

        $.post(ajaxUrl, {
            action: 'ccf_update_qty',
            nonce: nonce,
            cart_key: cartKey,
            qty: qty
        }, function (res) {
            if (res.success) {
                location.reload();
            } else {
                setLoading($form, false);
            }
        }).fail(function () {
            setLoading($form, false);
        });
    }

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
            if (res.success) {
                location.reload();
            } else {
                setLoading($form, false);
            }
        }).fail(function () {
            setLoading($form, false);
        });
    }

    // ── Events ──

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

    $(document).on('click', '.ccf-remove', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var $form = $(this).closest('.ccf-cart-form');
        if (!$form.length) return;
        removeItem($form);
    });

})(jQuery);
