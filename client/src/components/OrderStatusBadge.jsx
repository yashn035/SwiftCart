const STATUS_CONFIG = {
  placed:    { label: 'Placed',    color: 'badge-blue',   dot: 'bg-cyan-400' },
  packed:    { label: 'Packed',    color: 'badge-yellow', dot: 'bg-amber-400' },
  shipped:   { label: 'Shipped',   color: 'badge-purple', dot: 'bg-violet-400' },
  delivered: { label: 'Delivered', color: 'badge-green',  dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelled', color: 'badge-red',    dot: 'bg-red-400' },
  paid:      { label: 'Paid',      color: 'badge-green',  dot: 'bg-emerald-400' },
  pending:   { label: 'Pending',   color: 'badge-yellow', dot: 'bg-amber-400' },
  failed:    { label: 'Failed',    color: 'badge-red',    dot: 'bg-red-400' },
};

export default function OrderStatusBadge({ status, pulse = false }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'badge-blue', dot: 'bg-gray-400' };

  return (
    <span className={`${config.color} badge gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${pulse ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
