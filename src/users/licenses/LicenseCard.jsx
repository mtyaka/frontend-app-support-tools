import React, {
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import {
  Badge, Card, Row, Col,
} from '@edx/paragon';
import Table from '../../components/Table';
import { formatDate } from '../../utils';

export default function LicenseCard({
  licenseRecord,
}) {
  const statusMapping = {
    activated: 'success',
    revoked: 'danger',
    assigned: 'info',
    unassigned: 'primary',
  };
  const tableData = useMemo(() => {
    if (licenseRecord == null) {
      return [];
    }
    return [licenseRecord].map(record => ({
      assignedDate: formatDate(record.assignedDate),
      activationDate: formatDate(record.activationDate),
      revokedDate: formatDate(record.revokedDate),
      lastRemindDate: formatDate(record.lastRemindDate),
      activationLink: <a href={record.activationLink} rel="noopener noreferrer" target="_blank" className="word_break">{record.activationLink}</a>,
    }));
  }, [licenseRecord]);

  const columns = React.useMemo(
    () => [
      {
        Header: 'Assigned Date', accessor: 'assignedDate',
      },
      {
        Header: 'Activation Date', accessor: 'activationDate',
      },
      {
        Header: 'Revoked Date', accessor: 'revokedDate',
      },
      {
        Header: 'Last Remind Date', accessor: 'lastRemindDate',
      },
      {
        Header: 'Activation Link', accessor: 'activationLink',
      },
    ],
    [],
  );

  return (
    tableData && tableData.length ? (
      <Card className="pt-2 px-3 mb-1 w-100">
        <Card.Body className="p-0">
          <Card.Title as="h3" className="btn-header mt-4">
            {licenseRecord.subscriptionPlanTitle}
          </Card.Title>
          <Row>
            <Col>
              <Card.Subtitle align="left" as="h4">
                <Badge variant={statusMapping[licenseRecord.status]} className="badge-status">{licenseRecord.status}</Badge>
              </Card.Subtitle>
            </Col>
            <Col>
              <Card.Subtitle align="right" as="h4">
                Plan Expiration: {formatDate(licenseRecord.subscriptionPlanExpirationDate)}
              </Card.Subtitle>
            </Col>
          </Row>

          <Card.Title as="h5" className="btn-header mt-4">
            Additional Data
          </Card.Title>
          <Table
            data={tableData}
            columns={columns}
            styleName="sso-table"
            id="license-data-new"
          />
        </Card.Body>
      </Card>
    ) : (
      <></>
    )
  );
}

LicenseCard.propTypes = {
  licenseRecord: PropTypes.shape({
    status: PropTypes.string,
    assignedDate: PropTypes.string,
    activationDate: PropTypes.string,
    revokedDate: PropTypes.string,
    lastRemindDate: PropTypes.string,
    activationLink: PropTypes.string,
    subscriptionPlanTitle: PropTypes.string,
    subscriptionPlanExpirationDate: PropTypes.string,
  }).isRequired,
};
