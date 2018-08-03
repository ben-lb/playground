const url = "http://localhost:3000/machines";
var expandOnLoad = true;

setInterval(function() { set_data(); }, 3000); // refresh table evert 3 seconds

const colModel = [
    { label: 'Name', name: 'name', key: true, width: 130 },
    { label: 'Type', name: 'type', width: 100 },
    { label: 'VMs', name: 'vms', hidden: true },
    { label: 'State', name: 'state', width: 100 },
    { label: 'Used by', name: 'used_by', width: 100 },
    { label: 'Labels', name: 'labels', width: 350 },
    { label: 'Uptime', name: 'uptime', width: 150 },
    { label: 'Allocation ID', name: 'allocation_id', width: 250 },
]


let colModelVM = [];
for(let i = 0; i < colModel.length; i++)
{
    if(colModel[i]['name'] === 'labels') {
        continue;
    }
    colModelVM.push(colModel[i]);
}



$(document).ready(function () {
    $("#jqGrid").jqGrid({
        mtype: "GET",
        url: set_data(),
        datatype: 'local',
        styleUI : 'bootstrap',
        // guiStyle: "bootstrap4",
        colModel: colModel,
        sortname: "name",
        viewrecords: true,
        height: '100%',
        width: 1500,
        rowNum: 10000,
        cmTemplate: {editable: true},
        sortable: true,
        forceClientSorting: true,
        subGrid: true,
        subGridRowExpanded: showChildGrid,
        subGridOptions : {
            hasSubgrid: function (options) {
					return options.data.vms.length > 0;
				},

            // expand all rows on load
            expandOnLoad: expandOnLoad
        },
        gridview: false,
        afterInsertRow: function(rowid, aData, rowelem) {
            let rowData = $('#jqGrid').getLocalRow(rowid);
            if(rowData['vms'].length === 0){
                $('tr#'+rowid, $('#jqGrid')).children("td.sgcollapsed").html("").removeClass('ui-sgcollapsed sgcollapsed');
            }
        },
        loadComplete: function () {
            expandOnLoad = false;
        }
    });
    $('#jqGrid').jqGrid('filterToolbar');
    // $('#jqGrid').css('font-size','14px');

});


// the event handler on expanding parent row receives two parameters
// the ID of the grid tow  and the primary key of the row
function showChildGrid(parentRowID, parentRowKey) {
    let childGridID = parentRowID + "_table";
    let childGridPagerID = parentRowID + "_pager";

    // add a table and pager HTML elements to the parent grid row - we will render the child grid here
    $('#' + parentRowID).append('<table id=' + childGridID + '></table>' +
        '<div id=' + childGridPagerID + ' class=scroll></div>');
    let grid_id = "#" + childGridID;
    $(grid_id).jqGrid({
        data: get_vms_data_by_parent_row_id(parentRowKey),
        mtype: "GET",
        datatype: "local",
        colModel: colModelVM,
        sortable: true,
        sortname: 'name',
        width: 1400,
        height: '100%',
    });

}


function get_vms_data_by_parent_row_id(row_id) {
    let rowData = $('#jqGrid').getLocalRow(row_id);
    let rows = [];
    for(let i = 0; i < rowData['vms'].length; i++)
    {
        let vm = rowData['vms'][i];
        add_machine(rows, vm);
    }
    return rows;
}

function set_data() {
    $.ajax({
        type: "GET",
        datatype: 'json',
        url: url,
        success: function (data) {
            let organized_data = organize_machines_data(data);
            $('#jqGrid').jqGrid('setGridParam',
                {datatype: 'local', data: organized_data}).trigger('reloadGrid', [{current:true}]);
        }
    })
}

function organize_machines_data(data) {
    let rows = [];
    for(let i = 0; i < data.length; i++)
    {
        let rack = data[i];
        for(let j = 0; j < rack['machines'].length; j++)
        {
            let machine = rack['machines'][j];
            add_machine(rows, machine);
        }

    }
    return rows;
}

function add_machine(rows, machine) {
    let user_name = null;
    let from_time = null;
    if(machine['allocation'] !== null) {
        if(machine.hasOwnProperty('user_name')) { user_name = machine['user_name']; }
        from_time = machine['last_inauguration_date'];
    }
    let data = {
        'name': machine['id'],
        'type': machine['type'],
        'state': machine['state'],
        'used_by': user_name,
        'labels': machine['host_label'],
        'uptime': calculate_uptime(from_time),
        'allocation_id': machine['allocation'],
        'vms': machine['vms']};
    rows.push(data);
}

function calculate_uptime(from_time) {
    if(from_time === null) { return null; }
    let now = new Date();
    let before = new Date(from_time);
    let time_delta_in_seconds = (now - before) / 1000;
    if(time_delta_in_seconds < 60) { return "a few seconds"; }
    let time_delta_in_minutes = time_delta_in_seconds / 60;
    if(time_delta_in_minutes < 60) { return "less than 1 hour"; }
    let time_delta_in_hours = time_delta_in_minutes / 60;
    return parseInt(time_delta_in_hours) + " hours";
}