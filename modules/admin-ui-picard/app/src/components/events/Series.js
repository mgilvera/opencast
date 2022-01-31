import React, {useEffect, useState} from "react";
import MainNav from "../shared/MainNav";
import Link from "react-router-dom/Link";
import {useTranslation} from "react-i18next";
import cn from "classnames";
import {connect} from "react-redux";
import {withRouter} from "react-router-dom";
import TableFilters from "../shared/TableFilters";
import Table from "../shared/Table";
import Notifications from "../shared/Notifications";
import NewResourceModal from "../shared/NewResourceModal";
import DeleteSeriesModal from "./partials/modals/DeleteSeriesModal";
import {seriesTemplateMap} from "../../configs/tableConfigs/seriesTableConfig";
import {fetchSeries, fetchSeriesMetadata, fetchSeriesThemes} from "../../thunks/seriesThunks";
import {loadEventsIntoTable, loadSeriesIntoTable} from "../../thunks/tableThunks";
import {fetchEvents} from "../../thunks/eventThunks";
import {fetchFilters, fetchStats} from "../../thunks/tableFilterThunks";
import {getTotalSeries, isShowActions} from "../../selectors/seriesSeletctor";
import {editTextFilter} from "../../actions/tableFilterActions";
import {setOffset} from "../../actions/tableActions";
import {styleNavClosed, styleNavOpen} from "../../utils/componentsUtils";
import {logger} from "../../utils/logger";
import Header from "../Header";
import Footer from "../Footer";
import {getUserInformation} from "../../selectors/userInfoSelectors";
import {hasAccess} from "../../utils/utils";



// References for detecting a click outside of the container of the dropdown menu
const containerAction = React.createRef();

/**
 * This component renders the table view of series
 */
const Series = ({ showActions, loadingSeries, loadingSeriesIntoTable, loadingEvents, loadingEventsIntoTable,
                    series, loadingFilters, loadingStats, loadingSeriesMetadata, loadingSeriesThemes, resetTextFilter,
                    resetOffset, user }) => {
    const { t } = useTranslation();
    const [displayActionMenu, setActionMenu] = useState(false);
    const [displayNavigation, setNavigation] = useState(false);
    const [displayNewSeriesModal, setNewSeriesModal] = useState(false);
    const [displayDeleteSeriesModal, setDeleteSeriesModal] = useState(false);

    const loadEvents = () => {
        // Reset the current page to first page
        resetOffset();

        // Fetching stats from server
        loadingStats()

        // Fetching events from server
        loadingEvents();

        // Load events into table
        loadingEventsIntoTable();
    };

    const loadSeries = async () => {
        //fetching series from server
        await loadingSeries();

        //load series into table
        loadingSeriesIntoTable();
    }

    useEffect( () => {
        resetTextFilter();

        // Load series on mount
        loadSeries().then(r => logger.info(r));

        // Load series filters
        loadingFilters("series");

        // Function for handling clicks outside of an dropdown menu
        const handleClickOutside = e => {
            if (containerAction.current && !containerAction.current.contains(e.target)) {
                setActionMenu(false);
            }
        }

        // Fetch series every minute
        let fetchSeriesInterval = setInterval(loadSeries, 100000);


        // Event listener for handle a click outside of dropdown menu
        window.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
            clearInterval(fetchSeriesInterval);
        }
    }, []);

    const toggleNavigation = () => {
        setNavigation(!displayNavigation);
    };

    const handleActionMenu = e => {
        e.preventDefault();
        setActionMenu(!displayActionMenu);
    };

    const showNewSeriesModal = async () => {
        await loadingSeriesMetadata();
        await loadingSeriesThemes();

        setNewSeriesModal(true);
    };

    const hideNewSeriesModal = () => {
        setNewSeriesModal(false);
    };

    const hideDeleteModal = () => {
        setDeleteSeriesModal(false);
    };

    return (
        <>
            <Header />
            <section className="action-nav-bar">
                <div className="btn-group">
                    {hasAccess("ROLE_UI_SERIES_CREATE", user) && (
                        <button className="add" onClick={() => showNewSeriesModal()}>
                            <i className="fa fa-plus" />
                            <span>{t('EVENTS.EVENTS.ADD_SERIES')}</span>
                        </button>
                    )}
                </div>

                {/* Display modal for new series if add series button is clicked */}
                <NewResourceModal showModal={displayNewSeriesModal}
                                  handleClose={hideNewSeriesModal}
                                  resource={"series"}/>

                {displayDeleteSeriesModal && (
                    <DeleteSeriesModal close={hideDeleteModal}/>
                )}

                {/* Include Burger-button menu */}
                <MainNav  isOpen={displayNavigation}
                          toggleMenu={toggleNavigation}/>

                <nav>
                    {hasAccess("ROLE_UI_EVENTS_VIEW", user) && (
                        <Link to="/events/events"
                              className={cn({active: false})}
                              onClick={() => loadEvents()}>
                            {t('EVENTS.EVENTS.NAVIGATION.EVENTS')}
                        </Link>
                    )}
                    {hasAccess("ROLE_UI_SERIES_VIEW", user) && (
                        <Link to="/events/series"
                              className={cn({active: true})}
                              onClick={() => loadSeries()}>
                            {t('EVENTS.EVENTS.NAVIGATION.SERIES')}
                        </Link>
                    )}
                </nav>
            </section>

            <div className="main-view" style={displayNavigation ? styleNavOpen : styleNavClosed}>
                {/* Include notifications component */}
                <Notifications />

                <div className="controls-container">
                    <div className="filters-container">
                        <div className={cn("drop-down-container", {disabled: !showActions})}
                             onClick={e => handleActionMenu(e)}
                             ref={containerAction} >
                            <span>{t('BULK_ACTIONS.CAPTION')}</span>
                            {/* show dropdown if actions is clicked*/}
                            { displayActionMenu && (
                                <ul className="dropdown-ul">
                                    {hasAccess("ROLE_UI_SERIES_DELETE", user) && (
                                        <li>
                                            <a onClick={() => setDeleteSeriesModal(true)}>
                                                {t('BULK_ACTIONS.DELETE.SERIES.CAPTION')}
                                            </a>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                        {/* Include filters component */}
                        {/* Todo: fetch actual filters for series */}
                        <TableFilters loadResource={loadingSeries}
                                      loadResourceIntoTable={loadingSeriesIntoTable}
                                      resource={'series'} />

                    </div>
                    <h1>{t('EVENTS.SERIES.TABLE.CAPTION')}</h1>
                    {/* Include table view */}
                    <h4>{t('TABLE_SUMMARY', { numberOfRows: series })}</h4>
                </div>
                <Table templateMap={seriesTemplateMap} />
            </div>
            <Footer />
        </>
    )
}

// Getting state data out of redux store
const mapStateToProps = state => ({
    series: getTotalSeries(state),
    showActions: isShowActions(state),
    user: getUserInformation(state)
});

// Mapping actions to dispatch
const mapDispatchToProps = dispatch => ({
    loadingSeries: () => dispatch(fetchSeries()),
    loadingSeriesIntoTable: () => dispatch(loadSeriesIntoTable()),
    loadingEvents: () => dispatch(fetchEvents()),
    loadingEventsIntoTable: () => dispatch(loadEventsIntoTable()),
    loadingFilters: resource => dispatch(fetchFilters(resource)),
    loadingStats: () => dispatch(fetchStats()),
    loadingSeriesMetadata: () => dispatch(fetchSeriesMetadata()),
    loadingSeriesThemes: () => dispatch(fetchSeriesThemes()),
    resetTextFilter: () => dispatch(editTextFilter('')),
    resetOffset: () => dispatch(setOffset(0))
});

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Series));
