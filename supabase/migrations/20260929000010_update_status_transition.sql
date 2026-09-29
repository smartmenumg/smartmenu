CREATE OR REPLACE FUNCTION public.validate_order_status_transition(
  current_status public.order_status,
  new_status     public.order_status
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  RETURN CASE current_status
    WHEN 'pending_payment' THEN new_status IN ('confirmed', 'cancelled')
    WHEN 'confirmed'       THEN new_status IN ('accepted', 'cancelled')
    -- Allow direct transition from accepted to delivered, supporting the new 2-step admin flow
    WHEN 'accepted'        THEN new_status IN ('preparing', 'ready', 'delivered', 'cancelled')
    WHEN 'preparing'       THEN new_status IN ('ready', 'delivered')
    WHEN 'ready'           THEN new_status IN ('delivered')
    WHEN 'delivered'       THEN FALSE  -- terminal state
    WHEN 'cancelled'       THEN FALSE  -- terminal state
    ELSE FALSE
  END;
END;
$$;
