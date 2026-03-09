export default function Stepper({ steps, onStepClick }) {
  const total = steps.length;
  const completed = steps.filter((step) => step.status === "completed").length;
  const progress = Math.round((completed / total) * 100);

  return (
    <div className="stepper">
      <div
        className="stepper__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-valuetext={`${progress}% completado`}
      >
        <span
          className="stepper__progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="stepper__list">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`stepper__item stepper__item--${step.status}`}
            aria-current={step.status === "current" ? "step" : undefined}
          >
            {typeof onStepClick === "function" ? (
              <button
                type="button"
                className="stepper__item-btn"
                onClick={() => onStepClick(index)}
              >
                <span className="stepper__bullet" aria-hidden="true">
                  {step.status === "completed" ? "✓" : index + 1}
                </span>
                <span className="stepper__label">{step.label}</span>
                {step.helper ? (
                  <span className="stepper__helper">{step.helper}</span>
                ) : null}
              </button>
            ) : (
              <>
                <span className="stepper__bullet" aria-hidden="true">
                  {step.status === "completed" ? "✓" : index + 1}
                </span>
                <span className="stepper__label">{step.label}</span>
                {step.helper ? (
                  <span className="stepper__helper">{step.helper}</span>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
