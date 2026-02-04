export default function CheckboxGroup({ label, name, options, selectedValues = [], onChange }) {
    const handleToggle = (option) => {
        const nextValues = selectedValues.includes(option)
            ? selectedValues.filter(v => v !== option)
            : [...selectedValues, option];
        onChange({ [name]: nextValues });
    };

    return (
        <div className="stack-2" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{label}</label>
            <div className="cluster gap-2 wrap bg-light p-3 rounded" style={{ border: '1px solid var(--border)' }}>
                {options.map(opt => (
                    <label key={opt} className="cluster align-center gap-1 cursor-pointer" style={{ fontSize: '0.85rem' }}>
                        <input 
                            type="checkbox" 
                            checked={selectedValues.includes(opt)} 
                            onChange={() => handleToggle(opt)} 
                        />
                        {opt}
                    </label>
                ))}
            </div>
        </div>
    );
}