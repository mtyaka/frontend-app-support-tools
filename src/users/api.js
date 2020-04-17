import { getConfig, camelCaseObject } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

const EMAIL_REGEX = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
const USERNAME_REGEX = '^[\\w.@_+-]+$';

export async function getEntitlements(username) {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getConfig().LMS_BASE_URL}/api/entitlements/v1/entitlements/?user=${username}`,
  );
  return data;
}

export async function getEnrollments(username) {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getConfig().LMS_BASE_URL}/support/enrollment/${username}`,
  );
  return data;
}

export async function getUser(userIdentifier) {
  let url = `${getConfig().LMS_BASE_URL}/api/user/v1/accounts`;
  let notFoundErrorText = "We couldn't find a user with the ";
  // I am avoiding an `else` case here because we have already validated the input
  // to fall into one of these cases.
  if (userIdentifier.match(EMAIL_REGEX)) {
    url += `?email=${userIdentifier}`;
    notFoundErrorText += `email "${userIdentifier}".`;
  } else if (userIdentifier.match(USERNAME_REGEX)) {
    url += `/${userIdentifier}`;
    notFoundErrorText += `username "${userIdentifier}".`;
  } else {
    throw new Error('Invalid Argument!');
  }
  try {
    const { data } = await getAuthenticatedHttpClient().get(url);
    return Array.isArray(data) && data.length > 0 ? data[0] : data;
  } catch (error) {
    // We don't have good error handling in the app for any errors that may have come back
    // from the API, so we log them to the console and tell the user to go look.  We would
    // never do this in a customer-facing app.
    // eslint-disable-next-line no-console
    console.log(JSON.parse(error.customAttributes.httpErrorResponseData));
    if (error.customAttributes.httpErrorStatus === 404) {
      error.userError = {
        code: null,
        dismissible: true,
        text: notFoundErrorText,
        type: 'error',
        topic: 'general',
      };
      throw error;
    }

    error.userError = {
      code: null,
      dismissible: true,
      text: 'There was an error loading this user\'s data. Check the JavaScript console for detailed errors.',
      type: 'danger',
      topic: 'general',
    };
    throw error;
  }
}

export async function getUserVerificationStatus(username) {
  try {
    const { data } = await getAuthenticatedHttpClient().get(
      `${getConfig().LMS_BASE_URL}/api/user/v1/accounts/${username}/verification_status/`,
    );
    return data;
  } catch (error) {
    // We don't have good error handling in the app for any errors that may have come back
    // from the API, so we log them to the console and tell the user to go look.  We would
    // never do this in a customer-facing app.
    // eslint-disable-next-line no-console
    console.log(JSON.parse(error.customAttributes.httpErrorResponseData));
    if (error.customAttributes.httpErrorStatus === 404) {
      return {
        status: 'Not Available',
        expirationDatetime: '',
        isVerified: false,
      };
    }
    return {
      status: 'Error, status unknown',
      expirationDatetime: '',
      isVerified: false,
    };
  }
}

export async function getRetirement(username) {
  try {
    let { data } = await getAuthenticatedHttpClient()
      .get(
        `${getConfig().LMS_BASE_URL}/api/user/v1/accounts/${username}/retirement_information/`,
      );

    data = camelCaseObject(data);
    const retirementRequestDate = new Date(data.retirementRequestDate);
    let errorString = `User with username ${username} has been retired. The user requested retirement on ${retirementRequestDate}. `;

    if (data.retirementDate) {
      const retirementDate = new Date(data.retirementDate);
      errorString = errorString.concat(`They were retired on ${retirementDate}`);
    } else {
      errorString = errorString.concat('Information about their retirement date is not available');
    }
    const error = {};
    error.userError = {
      code: null,
      dismissible: true,
      text: errorString,
      type: 'error',
      topic: 'general',
    };
    return error;
  } catch (error) {
    if (error.customAttributes.httpErrorStatus === 404) {
      error.userError = {
        code: null,
        dismissible: true,
        text: `We couldn't find a user with the username "${username}".`,
        type: 'error',
        topic: 'general',
      };
      return error;
    }
  }
}

export async function getAllUserData(userIdentifier) {
  const errors = [];
  let user = null;
  let entitlements = [];
  let enrollments = [];
  let retirement = null;
  let verificationStatus = null;

  try {
    user = await getUser(userIdentifier);
  } catch (error) {
    // the user might be retired, so try getting the retirement information
    // treat this information as an "error" so it ends up in the banner
    retirement = await getRetirement(userIdentifier);
    errors.push(retirement.userError);
    if (error.userError) {
      errors.push(error.userError);
    } else {
      throw error;
    }
  }
  if (user !== null) {
    entitlements = await getEntitlements(user.username);
    enrollments = await getEnrollments(user.username);
    verificationStatus = await getUserVerificationStatus(user.username);
  }

  return {
    errors,
    user,
    entitlements,
    enrollments,
    verificationStatus,
  };
}

export async function getCourseData(courseUUID) {
  try {
    const { data } = await getAuthenticatedHttpClient()
      .get(
        `${getConfig().DISCOVERY_API_BASE_URL}/api/v1/courses/${courseUUID}/`,
      );
    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(JSON.parse(error.customAttributes.httpErrorResponseData));
    if (error.customAttributes.httpErrorStatus === 404) {
      const courseError404 = {
        code: null,
        dismissible: true,
        text: `We couldn't find summary data for this Course "${courseUUID}".`,
        type: 'error',
        topic: 'course-summary',
      };
      return { errors: [courseError404] };
    }
    const courseError = {
      code: null,
      dismissible: true,
      text: `Error finding summary data for this Course "${courseUUID}".`,
      type: 'danger',
      topic: 'course-summary',
    };
    return { errors: [courseError] };
  }
}

export async function patchEntitlement({
  uuid, action, unenrolledRun = null, comments = null,
}) {
  try {
    const { data } = await getAuthenticatedHttpClient().patch(
      `${getConfig().LMS_BASE_URL}/api/entitlements/v1/entitlements/${uuid}/`,
      {
        expired_at: null,
        support_details: [{
          unenrolled_run: unenrolledRun,
          action,
          comments,
        }],
      },
    );
    return data;
  } catch (error) {
    if (error.customAttributes.httpErrorStatus === 400) {
      // We don't have good error handling in the app for any errors that may have come back
      // from the API, so we log them to the console and tell the user to go look.  We would
      // never do this in a customer-facing app.
      // eslint-disable-next-line no-console
      console.log(JSON.parse(error.customAttributes.httpErrorResponseData));
    }
    return {
      errors: [
        {
          code: null,
          dismissible: true,
          text: 'There was an error submitting this entitlement. Check the JavaScript console for detailed errors.',
          type: 'danger',
          topic: 'entitlements',
        },
      ],
    };
  }
}

export async function postEntitlement({
  user, courseUuid, mode, action, comments = null,
}) {
  try {
    const { data } = await getAuthenticatedHttpClient().post(
      `${getConfig().LMS_BASE_URL}/api/entitlements/v1/entitlements/`,
      {
        course_uuid: courseUuid,
        user,
        mode,
        refund_locked: true,
        support_details: [{
          action,
          comments,
        }],
      },
    );
    return data;
  } catch (error) {
    if (error.customAttributes.httpErrorStatus === 400) {
      // We don't have good error handling in the app for any errors that may have come back
      // from the API, so we log them to the console and tell the user to go look.  We would
      // never do this in a customer-facing app.
      // eslint-disable-next-line no-console
      console.log(JSON.parse(error.customAttributes.httpErrorResponseData));
    }
    return {
      errors: [
        {
          code: null,
          dismissible: true,
          text: 'There was an error submitting this entitlement. Check the JavaScript console for detailed errors.',
          type: 'danger',
          topic: 'entitlements',
        },
      ],
    };
  }
}

export async function postEnrollmentChange({
  user, courseID, newMode, oldMode, reason,
}) {
  try {
    const { data } = await getAuthenticatedHttpClient().post(
      `${getConfig().LMS_BASE_URL}/support/enrollment/${user}`,
      {
        course_id: courseID,
        new_mode: newMode,
        old_mode: oldMode,
        reason,
      },
    );
    return data;
  } catch (error) {
    if (error.customAttributes.httpErrorStatus === 400) {
      // We don't have good error handling in the app for any errors that may have come back
      // from the API, so we log them to the console and tell the user to go look.  We would
      // never do this in a customer-facing app.
      // eslint-disable-next-line no-console
      console.log(JSON.parse(error.customAttributes.httpErrorResponseData));
    }
    return {
      errors: [
        {
          code: null,
          dismissible: true,
          text: 'There was an error submitting this entitlement. Check the JavaScript console for detailed errors.',
          type: 'danger',
          topic: 'enrollments',
        },
      ],
    };
  }
}
