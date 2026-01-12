import Card, { CardBody, CardHeader } from "../UI/Card";

export default function ClinicalSectionCard({ section, children }) {
  return (
    <Card hoverable={false}>
      <CardHeader>
        <div className="stack-1">
          <h3 style={{ margin: 0 }}>{section.title}</h3>
          {section.description && (
            <p className="helper-text" style={{ margin: 0 }}>
              {section.description}
            </p>
          )}
        </div>
      </CardHeader>
      <CardBody className="stack-4">
        {children}
      </CardBody>
    </Card>
  );
}



